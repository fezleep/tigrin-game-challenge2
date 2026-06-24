# bank robbery slot challenge

Cena principal do desafio tecnico usando Vite, JavaScript puro, PixiJS v7 e pixi-spine.

## etapa atual

- cena principal premium
- fundo escuro inspirado em vault/banco
- painel 5x4 com simbolos Spine
- fox em idle quando houver espaco horizontal
- HUD inferior com balance, win e bet
- botao spin com randomizacao simples dos simbolos

## assets Spine validados

- `Bank/Bank.json` com animacao `Bank`
- `Safe/Safe.json` com animacao `animation`
- `Handcuffs/Handcuffs.json` com animacao `animation`
- `Dynamit/Dynamite.json` com animacao `animation`
- `Fox/Fox.json` com animacoes `Idle` e `Win`

## executar localmente

```bash
npm install
npm run check:spine
npm run dev
```

## build

```bash
npm run build
```
