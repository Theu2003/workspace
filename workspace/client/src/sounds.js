// Titulo: sounds
// Finalidade: Modulo do frontend responsavel pelos sons de notificacao.
const UNSEEN_KEY = 'reciclaja_seen_notification_ids';

const SOUNDS = {
  message: '/mp3/mp3_1.mp3',
  collection: '/mp3/mp3_2.mp3'
};

const MESSAGE_TYPES = new Set(['mensagem_empresa', 'mensagem_usuario', 'mensagem_admin']);
const COLLECTION_ACCEPTED_TYPES = new Set(['coleta_aceita']);

let audioMap = {};

function getAudio(kind) {
  if (!audioMap[kind]) {
    audioMap[kind] = new Audio(SOUNDS[kind]);
    audioMap[kind].preload = 'auto';
  }
  return audioMap[kind];
}

export function playMessageSound() {
  try {
    const audio = getAudio('message');
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Navegadores bloqueiam autoplay antes da 1a interacao do usuario
    });
  } catch {
  }
}

export function playCollectionAcceptedSound() {
  try {
    const audio = getAudio('collection');
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Navegadores bloqueiam autoplay antes da 1a interacao do usuario
    });
  } catch {
  }
}

function getSeenIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(UNSEEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveSeenIds(set) {
  try {
    localStorage.setItem(UNSEEN_KEY, JSON.stringify([...set].slice(-200)));
  } catch {
  }
}

function notify(type) {
  if (MESSAGE_TYPES.has(type)) return playMessageSound();
  if (COLLECTION_ACCEPTED_TYPES.has(type)) return playCollectionAcceptedSound();
}

// Chamado pelo polling de notificacoes (auth.js). Toca som apenas para
// notificacoes novas (nunca vistas neste navegador) desde a ultima checagem.
// Na primeira execucao apenas registra as existentes, sem tocar som.
export function checkNotificationSounds(notifications) {
  if (!Array.isArray(notifications) || notifications.length === 0) return;

  const firstRun = localStorage.getItem(UNSEEN_KEY) === null;
  const seen = getSeenIds();
  const incomingIds = new Set(notifications.map((n) => n.id));

  if (!firstRun) {
    for (const n of notifications) {
      if (!seen.has(n.id)) {
        notify(n.type);
        break; // toca um som por checagem apenas
      }
    }
  }

  // Remove ids que nao existem mais e salva os vistos
  const pruned = new Set([...seen].filter((id) => incomingIds.has(id)));
  for (const n of notifications) pruned.add(n.id);
  saveSeenIds(pruned);
}
