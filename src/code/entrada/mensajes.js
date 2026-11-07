// Nodo "Mensajes": parte la respuesta del Plan en trozos de 4096 (HTML ya escapado en el núcleo) y arma un item por mensaje.
function armarMensajes(chatId, respuesta) {
  if (chatId === null || chatId === undefined) return [];
  return partirMensaje(respuesta, 4096).map(function (p) { return { chat_id: chatId, texto: p }; });
}

if (typeof $input !== 'undefined') {
  var _p = $('Plan').first().json;
  return armarMensajes(_p.chat_id, _p.respuesta).map(function (m) { return { json: m }; });
}
