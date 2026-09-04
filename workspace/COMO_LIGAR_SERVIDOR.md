# 🚀 Como Ligar o Servidor (Acessível pela Rede Wi-Fi)

## Pré-requisitos
- Node.js instalado
- Estar conectado à mesma rede Wi-Fi

## Passo a passo

### 1. Abrir o terminal e navegar até a pasta do projeto
```bash
cd workspace
```

### 2. Iniciar o servidor (API) - Porta 3001
```bash
cd server && npm run dev
```
> Aguarde a mensagem: "ReciclaJá API rodando na porta 3001 (acessível em qualquer rede)"

### 3. Abrir um NOVO terminal e iniciar o cliente (Vite)
```bash
cd workspace/client && npm run dev
```
> Aguarde a mensagem mostrando a URL (ex: http://192.168.x.x:5173)

### 4. Acessar pelo celular
Abra o navegador do celular e digite a URL que apareceu no terminal do Vite.
Exemplo:
```
http://192.168.2.104:5173
```

## Como parar os servidores
Em cada terminal, pressione:
```
Ctrl + C
```

## Como encontrar o IP da máquina
Windows:
```bash
ipconfig
```
Procure o "Endereço IPv4" na seção "Wi-Fi" ou "Ethernet".

## Observação importante
- O número da porta do Vite pode mudar (5173, 5174, 5175...) se já houver outro processo usando essa porta.
- Sempre olhe no terminal para ver a porta correta que foi atribuída.
