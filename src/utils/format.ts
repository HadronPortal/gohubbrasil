export const money = (value: number | string | null | undefined) => {
  const number = Number(value ?? 0);

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number.isFinite(number) ? number : 0);
};
