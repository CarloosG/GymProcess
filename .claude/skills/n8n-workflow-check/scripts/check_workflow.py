#!/usr/bin/env python3
"""Revisión estática de flujos n8n de William (sin ejecutarlos).

Uso:
  python3 check_workflow.py FLUJO.json [--base EXPORT_ANTERIOR.json] [--modo entrega|produccion] [--json]

  --base        Compara contra el export anterior: IDs de nodo, webhookId, credenciales, errorWorkflow.
  --modo        'entrega' (por defecto) exige active:false y timezone; 'produccion' solo los informa
                (útil para auditar exports que están corriendo).
  --json        Imprime el resultado como JSON (para la skill de auditoría).

Sale con código 1 si hay algún ❌.
"""
import argparse
import json
import os
import re
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))

VERSIONES = {
    "n8n-nodes-base.code": 2,
    "n8n-nodes-base.if": 2.3,
    "n8n-nodes-base.switch": 3.4,
    "n8n-nodes-base.set": 3.4,
    "n8n-nodes-base.googleSheets": 4.7,
    "n8n-nodes-base.httpRequest": 4.5,
    "n8n-nodes-base.telegram": 1.2,
    "n8n-nodes-base.telegramTrigger": 1.2,
    "@n8n/n8n-nodes-langchain.googleGemini": 1.2,
    "n8n-nodes-base.googleDrive": 3,
    "n8n-nodes-base.scheduleTrigger": 1.2,
    "n8n-nodes-base.wait": 1.1,
}

SIN_ENTRADA_OK = ("trigger", "Trigger", "webhook", "stickyNote", "manualTrigger", "errorTrigger")

SECRETOS = [
    ("token de bot de Telegram", re.compile(r"\b\d{8,10}:AA[A-Za-z0-9_-]{30,40}\b|\b\d{8,10}:[A-Za-z0-9_-]{35,40}\b")),
    ("API key de Google (AIza…)", re.compile(r"AIza[0-9A-Za-z_-]{35}")),
    ("API key de Groq (gsk_…)", re.compile(r"gsk_[A-Za-z0-9]{20,}")),
    ("API key tipo sk-…", re.compile(r"\bsk-[A-Za-z0-9_-]{20,}")),
    ("token OAuth de Google (ya29.)", re.compile(r"ya29\.[0-9A-Za-z_-]{20,}")),
    ("Bearer con valor literal", re.compile(r"Bearer\s+[A-Za-z0-9._-]{20,}")),
    ("clave privada", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("token de acceso de WhatsApp/Meta (EAA…)", re.compile(r"\bEAA[A-Za-z0-9]{50,}")),
]

PROHIBIDOS = [
    ("N8N_CONCURRENCY_PRODUCTION_LIMIT (causó triplicados)", re.compile(r"N8N_CONCURRENCY_PRODUCTION_LIMIT")),
    ("modelo Gemini 3.8 Flash (solo 20 peticiones al día)", re.compile(r"gemini-3\.8-flash(?!-lite)", re.I)),
]


class Informe:
    def __init__(self):
        self.items = []  # (nivel, grupo, mensaje)

    def add(self, nivel, grupo, msg):
        self.items.append((nivel, grupo, msg))

    def err(self, g, m):
        self.add("ERROR", g, m)

    def warn(self, g, m):
        self.add("AVISO", g, m)

    def ok(self, g, m):
        self.add("OK", g, m)

    def info(self, g, m):
        self.add("INFO", g, m)

    @property
    def errores(self):
        return [i for i in self.items if i[0] == "ERROR"]


def enmascarar(s):
    return s[:6] + "…" + s[-3:] if len(s) > 12 else "…"


def es_trigger(n):
    return any(k in n["type"] for k in SIN_ENTRADA_OK)


def recorrer_strings(obj, ruta=""):
    if isinstance(obj, str):
        yield ruta, obj
    elif isinstance(obj, dict):
        for k, v in obj.items():
            yield from recorrer_strings(v, f"{ruta}.{k}" if ruta else k)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from recorrer_strings(v, f"{ruta}[{i}]")


# ---------------------------------------------------------------- estructura
def revisar_estructura(w, inf):
    G = "Estructura"
    nodos = w.get("nodes")
    if not isinstance(nodos, list) or not nodos:
        inf.err(G, "El JSON no tiene lista 'nodes'. ¿Es un export de n8n?")
        return
    nombres, ids = {}, {}
    for n in nodos:
        nombres[n.get("name")] = nombres.get(n.get("name"), 0) + 1
        ids[n.get("id")] = ids.get(n.get("id"), 0) + 1
    for k, c in nombres.items():
        if c > 1:
            inf.err(G, f"Nombre de nodo repetido: '{k}' ({c} veces).")
    for k, c in ids.items():
        if c > 1:
            inf.err(G, f"ID de nodo repetido: '{k}' ({c} veces).")
        if not k:
            inf.err(G, "Hay nodos sin 'id'.")

    existentes = set(nombres)
    con = w.get("connections", {})
    con_entrada = set()
    for origen, salidas in con.items():
        if origen not in existentes:
            inf.err(G, f"Conexión desde un nodo que no existe: '{origen}'.")
        for tipo, ramas in salidas.items():
            for rama in ramas or []:
                for d in rama or []:
                    if d.get("node") not in existentes:
                        inf.err(G, f"'{origen}' apunta a un nodo que no existe: '{d.get('node')}'.")
                    else:
                        con_entrada.add(d["node"])
    sueltos = [n["name"] for n in nodos
               if n["name"] not in con_entrada and not es_trigger(n) and "stickyNote" not in n["type"]]
    for s in sueltos:
        inf.warn(G, f"Nodo sin entrada (no se ejecuta nunca): '{s}'.")
    for n in nodos:
        if n.get("disabled"):
            inf.warn(G, f"Nodo desactivado: '{n['name']}'.")
    if not [i for i in inf.items if i[1] == G and i[0] == "ERROR"]:
        inf.ok(G, f"{len(nodos)} nodos, nombres e IDs únicos, conexiones válidas.")


# ---------------------------------------------------------------- entrega
def revisar_entrega(w, inf, modo):
    G = "Entrega"
    f = inf.err if modo == "entrega" else inf.info
    s = w.get("settings") or {}
    if w.get("active") is not False:
        f(G, f"'active' es {w.get('active')!r}; se entrega con active: false.")
    else:
        inf.ok(G, "active: false.")
    if s.get("timezone") != "America/Bogota":
        f(G, f"settings.timezone es {s.get('timezone')!r}; debe ser 'America/Bogota'.")
    else:
        inf.ok(G, "settings.timezone = America/Bogota.")
    es_flujo_errores = any(n["type"] == "n8n-nodes-base.errorTrigger" for n in w["nodes"])
    if not s.get("errorWorkflow") and not es_flujo_errores:
        inf.warn(G, "Sin settings.errorWorkflow: si falla, nadie se entera.")
    if w.get("pinData"):
        inf.warn(G, f"pinData con datos fijados en: {', '.join(w['pinData'].keys())}.")


# ---------------------------------------------------------------- contra base
def revisar_base(w, b, inf):
    G = "Contra export anterior"
    nb = {n["name"]: n for n in b["nodes"]}
    nw = {n["name"]: n for n in w["nodes"]}
    ids_w = {n["id"]: n for n in w["nodes"]}
    errores_previos = len(inf.errores)
    for nombre, viejo in nb.items():
        nuevo = nw.get(nombre)
        if nuevo is None:
            mismo = ids_w.get(viejo["id"])
            if mismo:
                inf.info(G, f"Renombrado: '{nombre}' → '{mismo['name']}' (conserva ID).")
                nuevo = mismo
            else:
                inf.warn(G, f"Nodo eliminado o recreado: '{nombre}' (su ID ya no está).")
                continue
        if nuevo["id"] != viejo["id"]:
            inf.err(G, f"'{nombre}' cambió de ID ({viejo['id']} → {nuevo['id']}).")
        if viejo.get("webhookId") and nuevo.get("webhookId") != viejo.get("webhookId"):
            grave = "trigger" in viejo["type"].lower()
            (inf.err if grave else inf.warn)(
                G, f"'{nombre}' cambió webhookId ({viejo['webhookId']} → {nuevo.get('webhookId')})"
                + (" — se rompe el webhook de Telegram." if grave else "."))
        cv, cn = viejo.get("credentials") or {}, nuevo.get("credentials") or {}
        for tipo, c in cv.items():
            if tipo not in cn:
                inf.err(G, f"'{nombre}' perdió la credencial {tipo} ({c.get('name')}).")
            elif cn[tipo].get("id") != c.get("id"):
                inf.err(G, f"'{nombre}' cambió la credencial {tipo}: {c.get('id')} → {cn[tipo].get('id')}.")
    sb, sw = b.get("settings") or {}, w.get("settings") or {}
    if sb.get("errorWorkflow") and sw.get("errorWorkflow") != sb.get("errorWorkflow"):
        inf.err(G, f"settings.errorWorkflow cambió: {sb.get('errorWorkflow')} → {sw.get('errorWorkflow')}.")
    if b.get("id") and w.get("id") and b["id"] != w["id"]:
        inf.info(G, f"El ID del flujo cambió ({b['id']} → {w['id']}); normal si se importa como flujo nuevo.")
    nuevos = [n for n in nw if n not in nb and nw[n]["id"] not in {x["id"] for x in b["nodes"]}]
    if nuevos:
        inf.info(G, f"{len(nuevos)} nodos nuevos: {', '.join(nuevos[:15])}{'…' if len(nuevos) > 15 else ''}.")
    if len(inf.errores) == errores_previos:
        inf.ok(G, "IDs, webhookId, credenciales y errorWorkflow conservados.")


# ---------------------------------------------------------------- versiones
def revisar_versiones(w, inf):
    G = "Versiones de nodo"
    malos = []
    for n in w["nodes"]:
        esp = VERSIONES.get(n["type"])
        if esp is not None and n.get("typeVersion") != esp:
            malos.append(f"'{n['name']}' {n['type'].split('.')[-1]} {n.get('typeVersion')} (se usa {esp})")
    for m in malos:
        inf.warn(G, m)
    if not malos:
        inf.ok(G, "Todas las versiones coinciden con las que usa William.")


# ---------------------------------------------------------------- telegram
def escapado_en_code_previo(w, nombre, texto):
    """Oura: acepta '={{ $json.campo }}' si TODOS los nodos que alimentan este nodo son Code que escapan '&amp;'."""
    if not re.fullmatch(r"=\{\{\s*\$json\.\w+\s*\}\}", texto.strip()):
        return False
    previos = [o for o, c in (w.get("connections") or {}).items()
               for salida in c.get("main", []) for d in (salida or []) if d.get("node") == nombre]
    tipos = {n["name"]: n for n in w["nodes"]}
    return bool(previos) and all(
        tipos.get(o, {}).get("type") == "n8n-nodes-base.code"
        and "&amp;" in (tipos[o].get("parameters") or {}).get("jsCode", "") for o in previos)


def revisar_telegram(w, inf):
    G = "Telegram"
    hubo = False
    for n in w["nodes"]:
        if n["type"] != "n8n-nodes-base.telegram":
            continue
        p = n.get("parameters") or {}
        recurso = p.get("resource", "message")
        op = p.get("operation", "sendMessage")
        af = p.get("additionalFields") or {}
        nombre = n["name"]
        if recurso != "message":
            continue
        hubo = True
        if op in ("sendMessage", "editMessageText"):
            if af.get("parse_mode") != "HTML":
                inf.err(G, f"'{nombre}' ({op}) sin parse_mode HTML: n8n usará Markdown y un '_' o '*' rompe el envío.")
            texto = p.get("text", "")
            if isinstance(texto, str) and "{{" in texto and "&amp;" not in texto:
                if escapado_en_code_previo(w, nombre, texto):
                    inf.ok(G, f"'{nombre}': el texto viene de un nodo Code que escapa & < > (lleva HTML intencional).")
                else:
                    inf.err(G, f"'{nombre}': el texto dinámico no escapa & < > (usar .replace(/&/g,'&amp;')…).")
            if isinstance(texto, str) and "{{" not in texto and re.search(r"&(?!amp;|lt;|gt;|quot;)|<(?!/?(b|i|u|s|code|pre|a)\b)", texto):
                inf.err(G, f"'{nombre}': texto fijo con '&' o '<' sin escapar; Telegram lo rechaza en HTML.")
            if op == "sendMessage" and af.get("appendAttribution") is not False:
                inf.warn(G, f"'{nombre}' sin appendAttribution: false (agrega 'This message was sent automatically with n8n').")
        elif op in ("sendPhoto", "sendDocument", "sendAudio", "sendVideo", "sendAnimation"):
            if af.get("caption") and af.get("parse_mode") != "HTML":
                inf.warn(G, f"'{nombre}' ({op}) tiene caption sin parse_mode HTML.")
        # botones
        kb = p.get("inlineKeyboard") or {}
        botones = []
        for fila in kb.get("rows", []):
            botones += (fila.get("row") or {}).get("buttons", [])
        if botones:
            for bt in botones:
                cd = (bt.get("additionalFields") or {}).get("callback_data", "")
                if isinstance(cd, str) and cd:
                    if cd.startswith("="):
                        lit = "".join(a or b for a, b in re.findall(r"'([^']*)'|\"([^\"]*)\"", cd))
                        if len(lit.encode()) > 40:
                            inf.warn(G, f"'{nombre}': callback_data con {len(lit.encode())} bytes fijos; el total no puede pasar de 64.")
                    elif len(cd.encode()) > 64:
                        inf.err(G, f"'{nombre}': callback_data de {len(cd.encode())} bytes (máximo 64).")
            textos = " ".join(str(b.get("text", "")) for b in botones)
            if len(botones) % 2:
                inf.warn(G, f"'{nombre}': {len(botones)} botones; la convención es en pares (2/4/6).")
            if "❌" not in textos and "Cancelar" not in textos and "botones" not in textos:
                inf.warn(G, f"'{nombre}': ningún botón de ❌ Cancelar.")
    if hubo and not [i for i in inf.items if i[1] == G and i[0] in ("ERROR", "AVISO")]:
        inf.ok(G, "parse_mode HTML, escape y botones correctos en todos los envíos.")


# ---------------------------------------------------------------- hoja
def revisar_hoja(w, inf):
    G = "Hoja (lecturas y escrituras)"
    batch_get = [n["name"] for n in w["nodes"] if n["type"] == "n8n-nodes-base.httpRequest"
                 and "values:batchGet" in str((n.get("parameters") or {}).get("url", ""))]
    lecturas = [n["name"] for n in w["nodes"] if n["type"] == "n8n-nodes-base.googleSheets"
                and (n.get("parameters") or {}).get("operation", "read") in ("read", "lookup", "getAll")]
    if len(batch_get) > 1:
        inf.warn(G, f"{len(batch_get)} lecturas batchGet ({', '.join(batch_get)}); la regla es una por ejecución.")
    for l in lecturas:
        inf.warn(G, f"Lectura suelta con Google Sheets: '{l}'. La regla es una sola lectura (batchGet → Tablas).")
    borrados = [n["name"] for n in w["nodes"] if n["type"] == "n8n-nodes-base.googleSheets"
                and (n.get("parameters") or {}).get("operation") == "delete"]
    for bnode in borrados:
        inf.info(G, f"Borrado físico de filas: '{bnode}' (pendiente Bloque 2: anular en vez de borrar).")
    if batch_get and not lecturas and len(batch_get) == 1:
        inf.ok(G, f"Una sola lectura: '{batch_get[0]}'.")


# ---------------------------------------------------------------- seguridad
def revisar_seguridad(w, inf):
    G = "Seguridad"
    hallados = 0
    for n in w["nodes"]:
        for ruta, s in recorrer_strings(n.get("parameters") or {}):
            for nombre, rx in SECRETOS:
                for m in rx.finditer(s):
                    hallados += 1
                    inf.err(G, f"'{n['name']}' ({ruta}): posible {nombre}: {enmascarar(m.group(0))}. Usar credencial.")
        p = n.get("parameters") or {}
        for h in ((p.get("headerParameters") or {}).get("parameters") or []):
            if str(h.get("name", "")).lower() in ("authorization", "x-api-key", "api-key") and h.get("value") and "{{" not in str(h.get("value")):
                hallados += 1
                inf.err(G, f"'{n['name']}': cabecera {h['name']} con valor literal. Usar credencial.")
    for ruta, s in recorrer_strings({k: v for k, v in w.items() if k != "nodes"}):
        for nombre, rx in SECRETOS:
            for m in rx.finditer(s):
                hallados += 1
                inf.err(G, f"({ruta}): posible {nombre}: {enmascarar(m.group(0))}.")
    if not hallados:
        inf.ok(G, "Sin tokens ni claves en el texto; las credenciales van por ID.")


def revisar_prohibidos(w, inf, texto):
    G = "Prohibidos"
    hubo = False
    for nombre, rx in PROHIBIDOS:
        if rx.search(texto):
            hubo = True
            inf.err(G, f"Aparece {nombre}.")
    if not hubo:
        inf.ok(G, "Ni N8N_CONCURRENCY_PRODUCTION_LIMIT ni Gemini 3.8 Flash.")


# ---------------------------------------------------------------- code
def revisar_code(w, inf):
    G = "Nodos Code"
    codigos = [(n["name"], (n.get("parameters") or {}).get("jsCode", ""))
               for n in w["nodes"] if n["type"] == "n8n-nodes-base.code"
               and (n.get("parameters") or {}).get("language", "javaScript") == "javaScript"]
    if not codigos:
        return
    try:
        r = subprocess.run(["node", os.path.join(AQUI, "sintaxis_code.js")],
                           input=json.dumps(codigos), capture_output=True, text=True, timeout=60)
        fallos = json.loads(r.stdout or "[]")
    except FileNotFoundError:
        inf.warn(G, "Node no está instalado: no se revisó la sintaxis de los Code.")
        fallos = None
    except Exception as e:  # noqa: BLE001
        inf.warn(G, f"No se pudo revisar la sintaxis: {e}")
        fallos = None
    if fallos:
        for f in fallos:
            inf.err(G, f"'{f['nodo']}': error de sintaxis: {f['error']}")
    for nombre, code in codigos:
        if re.search(r"\bsello\s*=", code) and "$execution.id" not in code:
            inf.warn(G, f"'{nombre}': 'sello' sin $execution.id; dos mensajes en el mismo segundo chocan.")
        if "$env." in code:
            inf.warn(G, f"'{nombre}': usa $env (bloqueado por defecto en n8n).")
        if re.search(r"\bnew Date\(\)\.toLocale|toLocaleString\(", code):
            inf.warn(G, f"'{nombre}': toLocaleString depende del ICU del servidor; usar pesos()/Luxon.")
    if fallos == []:
        inf.ok(G, f"{len(codigos)} nodos Code compilan sin errores de sintaxis.")


# ---------------------------------------------------------------- main
def revisar(ruta, base=None, modo="entrega"):
    inf = Informe()
    try:
        texto = open(ruta, encoding="utf-8").read()
        w = json.loads(texto)
    except Exception as e:  # noqa: BLE001
        inf.err("Estructura", f"No es un JSON válido: {e}")
        return inf, None
    revisar_estructura(w, inf)
    if not w.get("nodes"):
        return inf, w
    revisar_entrega(w, inf, modo)
    if base:
        revisar_base(w, json.load(open(base, encoding="utf-8")), inf)
    revisar_versiones(w, inf)
    revisar_telegram(w, inf)
    revisar_hoja(w, inf)
    revisar_seguridad(w, inf)
    revisar_prohibidos(w, inf, texto)
    revisar_code(w, inf)
    return inf, w


ICONO = {"ERROR": "❌", "AVISO": "⚠️ ", "OK": "✅", "INFO": "ℹ️ "}


def imprimir(ruta, inf, w):
    print(f"\n=== {os.path.basename(ruta)}" + (f" — {w.get('name')} ({len(w.get('nodes', []))} nodos)" if w else ""))
    grupos = []
    for _, g, _ in inf.items:
        if g not in grupos:
            grupos.append(g)
    for g in grupos:
        print(f"\n[{g}]")
        for nivel, gg, m in inf.items:
            if gg == g:
                print(f"  {ICONO[nivel]} {m}")
    e = len(inf.errores)
    a = len([i for i in inf.items if i[0] == "AVISO"])
    print(f"\nResultado: {e} errores, {a} avisos → {'NO ENTREGAR' if e else 'OK para entregar' if not a else 'Entregable, revisar avisos'}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("flujos", nargs="+")
    ap.add_argument("--base")
    ap.add_argument("--modo", choices=["entrega", "produccion"], default="entrega")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    if a.base and len(a.flujos) > 1:
        ap.error("--base solo se puede usar con un flujo.")
    total_err = 0
    salida = []
    for f in a.flujos:
        inf, w = revisar(f, a.base, a.modo)
        total_err += len(inf.errores)
        if a.json:
            salida.append({"archivo": f, "flujo": w.get("name") if w else None,
                           "hallazgos": [{"nivel": n, "grupo": g, "mensaje": m} for n, g, m in inf.items]})
        else:
            imprimir(f, inf, w)
    if a.json:
        print(json.dumps(salida, ensure_ascii=False, indent=1))
    sys.exit(1 if total_err else 0)


if __name__ == "__main__":
    main()
