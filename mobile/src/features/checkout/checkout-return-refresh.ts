export function getCheckoutReturnRefreshLabel(input: {
  isFetching: boolean;
  kind: "order" | "payment";
}) {
  if (!input.isFetching) {
    return input.kind === "order" ? "Refresh order state" : "Refresh payment status";
  }

  return input.kind === "order" ? "Refreshing order state" : "Refreshing payment status";
}
