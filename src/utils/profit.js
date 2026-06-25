export const calcProfit = ({ paidPrice = 0, soldPrice = 0, shippingCost = 0, platformFee = 13.25, packagingCost = 0.75 }) => {
  const salePrice = parseFloat(soldPrice) || 0;
  const paid = parseFloat(paidPrice) || 0;
  const shipping = parseFloat(shippingCost) || 0;
  const packaging = parseFloat(packagingCost) || 0;
  const feeAmount = salePrice * (parseFloat(platformFee) / 100);
  const netProfit = salePrice - paid - shipping - packaging - feeAmount;
  const roi = paid > 0 ? ((netProfit / paid) * 100) : 0;
  return {
    netProfit: parseFloat(netProfit.toFixed(2)),
    feeAmount: parseFloat(feeAmount.toFixed(2)),
    roi: parseFloat(roi.toFixed(1)),
  };
};

export const estimateProfit = ({ paidPrice = 0, avgSoldPrice = 0, shippingCost = 0, platformFee = 13.25, packagingCost = 0.75 }) => {
  return calcProfit({ paidPrice, soldPrice: avgSoldPrice, shippingCost, platformFee, packagingCost });
};

export const formatCurrency = (val) => {
  if (val === null || val === undefined || isNaN(val)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
};

export const formatPercent = (val) => {
  if (val === null || val === undefined || isNaN(val)) return "0%";
  return `${val > 0 ? "+" : ""}${val.toFixed(1)}%`;
};
