# Sons de notificação

Coloque aqui os arquivos de áudio das notificações (ex: mensagem nova, coleta confirmada etc).

## Formatos aceitos

- `.mp3` — recomendado (leve e compatível com todos os navegadores)
- `.ogg` / `.wav` — também funcionam

## Como referenciar no código

Tudo dentro de `public/` é servido na raiz da URL, então o caminho é:

```js
const audio = new Audio('/sounds/message.mp3')
audio.play().catch(() => {
  // Navegadores bloqueiam autoplay antes da 1ª interação do usuário
})
```

## Convenção de nomes sugerida

| Arquivo             | Uso                          |
| ------------------- | ---------------------------- |
| `message.mp3`       | Nova mensagem recebida       |
| `notification.mp3`  | Notificação geral do sistema |
| `collection.mp3`    | Coleta agendada/confirmada   |
