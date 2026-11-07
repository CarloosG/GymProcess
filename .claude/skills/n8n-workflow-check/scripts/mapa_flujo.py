#!/usr/bin/env python3
"""Inventario de un flujo n8n para auditar: disparadores, rutas, Switch/IF, IA, hoja, manejo de errores.

Uso:
  python3 mapa_flujo.py FLUJO.json [--rutas] [--code]

  --rutas   Muestra el árbol de rutas desde cada disparador.
  --code    Lista los nodos Code con sus líneas y los nodos que leen.
"""
import argparse
import json
import re
from collections import Counter, defaultdict

EXTERNOS = ("httpRequest", "googleSheets", "googleDrive", "telegram", "googleGemini", "gmail",
            "googleCalendar", "googleTasks", "whatsApp", "openAi", "lmChat", "postgres", "supabase")


def corto(t):
    return t.split(".")[-1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("flujo")
    ap.add_argument("--rutas", action="store_true")
    ap.add_argument("--code", action="store_true")
    a = ap.parse_args()
    w = json.load(open(a.flujo, encoding="utf-8"))
    nodos = {n["name"]: n for n in w["nodes"]}
    sal = defaultdict(list)  # origen -> [(salida, destino)]
    entra = Counter()
    for o, tipos in w.get("connections", {}).items():
        for tipo, ramas in tipos.items():
            for i, rama in enumerate(ramas or []):
                for d in rama or []:
                    sal[o].append((f"{tipo}[{i}]" if tipo != "main" else i, d["node"]))
                    entra[d["node"]] += 1

    s = w.get("settings") or {}
    print(f"# {w.get('name')}  ({len(nodos)} nodos)")
    print(f"activo={w.get('active')}  errorWorkflow={s.get('errorWorkflow')}  timezone={s.get('timezone')}")

    print("\n## Tipos de nodo")
    for t, c in Counter(corto(n["type"]) for n in w["nodes"]).most_common():
        print(f"  {c:3d} {t}")

    disparadores = [n for n in w["nodes"] if "trigger" in n["type"].lower() or corto(n["type"]) == "webhook"]
    print("\n## Disparadores")
    for n in disparadores:
        p = n.get("parameters") or {}
        det = p.get("updates") or p.get("rule") or p.get("path") or ""
        print(f"  - {n['name']} ({corto(n['type'])}) {json.dumps(det, ensure_ascii=False)[:150]}")

    print("\n## Decisiones (Switch / IF)")
    for n in w["nodes"]:
        t = corto(n["type"])
        if t not in ("switch", "if"):
            continue
        p = n.get("parameters") or {}
        destinos = defaultdict(list)
        for i, d in sal.get(n["name"], []):
            destinos[i].append(d)
        if t == "switch":
            reglas = (p.get("rules") or {}).get("values") or []
            etiquetas = []
            for i, r in enumerate(reglas):
                cond = (r.get("conditions") or {}).get("conditions") or []
                txt = r.get("outputKey") or " / ".join(str(c.get("rightValue")) for c in cond)[:40]
                etiquetas.append((i, txt))
            fb = (p.get("options") or {}).get("fallbackOutput")
            print(f"  - {n['name']} (switch, {len(reglas)} reglas, fallback={fb})")
            for i, txt in etiquetas:
                print(f"      [{i}] {txt!s:40} → {', '.join(destinos.get(i, [])) or '⚠ SIN CONEXIÓN'}")
            if fb == "extra":
                print(f"      [extra] {'':40} → {', '.join(destinos.get(len(reglas), [])) or '⚠ SIN CONEXIÓN'}")
        else:
            cond = (p.get("conditions") or {}).get("conditions") or []
            c0 = cond[0] if cond else {}
            txt = f"{str(c0.get('leftValue'))[:60]} {((c0.get('operator') or {}).get('operation'))} {str(c0.get('rightValue'))[:20]}"
            print(f"  - {n['name']} (if): {txt}{' (+%d)' % (len(cond) - 1) if len(cond) > 1 else ''}")
            print(f"      sí → {', '.join(destinos.get(0, [])) or '⚠ SIN CONEXIÓN'} | no → {', '.join(destinos.get(1, [])) or '(nada)'}")

    print("\n## IA (modelos y prompts)")
    for n in w["nodes"]:
        if "langchain" not in n["type"] and "openAi" not in n["type"]:
            continue
        p = n.get("parameters") or {}
        m = p.get("modelId") or p.get("model") or {}
        modelo = m.get("value") if isinstance(m, dict) else m
        textos = [v for k, v in p.items() if isinstance(v, str) and len(v) > 40]
        for msg in ((p.get("messages") or {}).get("values") or []):
            textos.append(str(msg.get("content", "")))
        largo = sum(len(t) for t in textos)
        origen = sorted(set(re.findall(r"\$\('([^']+)'\)\.\w+\(\)\.json\.(\w+)", " ".join(textos))))
        dinamico = f" + dinámico de {', '.join(a + '.' + b for a, b in origen)}" if origen else ""
        fallo = n.get("onError") or "detener"
        print(f"  - {n['name']}: {modelo} | {p.get('resource', 'text')} | texto fijo≈{largo} caracteres{dinamico} "
              f"| reintentos={n.get('maxTries') if n.get('retryOnFail') else 'no'} | si falla={fallo}")
        if origen:
            print("      (el tamaño real del prompt se mide simulando el nodo Code que lo arma)")

    print("\n## Hoja de cálculo y archivos")
    for n in w["nodes"]:
        t = corto(n["type"])
        p = n.get("parameters") or {}
        if t == "googleSheets":
            hoja = (p.get("sheetName") or {}).get("value") if isinstance(p.get("sheetName"), dict) else p.get("sheetName")
            print(f"  - {n['name']}: Sheets {p.get('operation', 'read')} → '{hoja}'")
        elif t == "httpRequest" and "googleapis.com" in str(p.get("url", "")) + json.dumps(n.get("credentials", {})):
            print(f"  - {n['name']}: HTTP {p.get('method', 'GET')} {str(p.get('url'))[:90]}")
        elif t == "googleDrive":
            print(f"  - {n['name']}: Drive {p.get('operation', 'upload')}")

    print("\n## Manejo de errores en nodos externos")
    sin = []
    for n in w["nodes"]:
        if any(e in n["type"] for e in EXTERNOS) and "Trigger" not in n["type"]:
            if not n.get("retryOnFail") and not n.get("onError"):
                sin.append(n["name"])
    print(f"  Nodos externos sin reintento ni onError ({len(sin)}): {', '.join(sin) or 'ninguno'}")
    cont = [n["name"] for n in w["nodes"] if n.get("onError") == "continueErrorOutput"
            and not any(i == 1 for i, _ in sal.get(n["name"], []))]
    if cont:
        print(f"  ⚠ continueErrorOutput sin rama de error conectada: {', '.join(cont)}")

    print("\n## Nodos sueltos y finales")
    sueltos = [n for n in nodos if entra[n] == 0 and n not in [d["name"] for d in disparadores]
               and "stickyNote" not in nodos[n]["type"]]
    print(f"  Sin entrada: {', '.join(sueltos) or 'ninguno'}")
    finales = [n for n in nodos if not sal.get(n) and "stickyNote" not in nodos[n]["type"]]
    print(f"  Finales (sin salida): {', '.join(finales)}")

    if a.code:
        print("\n## Nodos Code")
        for n in w["nodes"]:
            if corto(n["type"]) != "code":
                continue
            c = (n.get("parameters") or {}).get("jsCode", "")
            refs = sorted(set(re.findall(r"\$\('([^']+)'\)", c)))
            print(f"  - {n['name']}: {len(c.splitlines())} líneas | lee: {', '.join(refs) or '$input'}")

    if a.rutas:
        print("\n## Rutas desde cada disparador")
        for d in disparadores:
            visto = set()

            def bajar(nombre, nivel):
                print("  " + "  " * nivel + ("↳ " if nivel else "") + nombre + (" (ya visto)" if nombre in visto else ""))
                if nombre in visto or nivel > 40:
                    return
                visto.add(nombre)
                for _, dst in sal.get(nombre, []):
                    bajar(dst, nivel + 1)
            bajar(d["name"], 0)


if __name__ == "__main__":
    main()
