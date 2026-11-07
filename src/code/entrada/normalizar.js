// Nodo "Normalizar": reduce el update de Telegram a los campos que usa el flujo. No decide nada de negocio.
// Entrada: el update (message | callback_query) que llega de Config. Salida: un item con los campos normalizados.
function normalizarUpdate(u) {
  var upd = (u && typeof u === 'object') ? u : {};
  var cb = upd.callback_query || null;
  var msg = upd.message || (cb && cb.message) || null;
  var de = (cb && cb.from) || (upd.message && upd.message.from) || {};
  var chat = (msg && msg.chat) || {};
  var texto = '';
  var tipo = 'otro';
  if (cb) {
    tipo = 'boton';
    texto = typeof cb.data === 'string' ? cb.data : '';
  } else if (upd.message) {
    var m = upd.message;
    if (typeof m.text === 'string') {
      texto = m.text;
      tipo = /^\//.test(m.text.trim()) ? 'comando' : 'texto';
    } else if (m.voice || m.audio) {
      tipo = 'voz';
      texto = typeof m.caption === 'string' ? m.caption : '';
    } else if (typeof m.caption === 'string') {
      texto = m.caption;
    }
  }
  var nombre = [de.first_name, de.last_name].filter(function (x) { return typeof x === 'string' && x.trim() !== ''; }).join(' ').trim();
  var chatId = (typeof chat.id === 'number' && isFinite(chat.id)) ? chat.id : null;
  var esBot = de.is_bot === true;
  var motivo = '';
  if (chatId === null) motivo = 'sin_chat';
  else if (esBot) motivo = 'bot';
  else if (chat.type !== 'private') motivo = 'chat_no_privado';
  return {
    update_id: (typeof upd.update_id === 'number') ? upd.update_id : null,
    chat_id: chatId,
    chat_tipo: chat.type || '',
    from_id: (typeof de.id === 'number') ? de.id : null,
    is_bot: esBot,
    nombre: nombre,
    alias_tg: typeof de.first_name === 'string' ? de.first_name.trim() : '',
    username: typeof de.username === 'string' ? de.username : '',
    texto: texto.trim(),
    message_id: (msg && typeof msg.message_id === 'number') ? msg.message_id : null,
    tipo: tipo,
    recibido_ms: Date.now(),
    ignorar: motivo !== '',
    motivo_ignorar: motivo
  };
}

if (typeof $input !== 'undefined') {
  return $input.all().map(function (it) { return { json: normalizarUpdate(it.json) }; });
}
