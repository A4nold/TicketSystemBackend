#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
ATTENDEE_TOKEN="${ATTENDEE_TOKEN:-}"
ORGANIZER_TOKEN="${ORGANIZER_TOKEN:-}"
EUR_EVENT_ID="${EUR_EVENT_ID:-}"
EUR_EVENT_SLUG="${EUR_EVENT_SLUG:-}"
EUR_TICKET_TYPE_ID="${EUR_TICKET_TYPE_ID:-}"
NGN_EVENT_ID="${NGN_EVENT_ID:-}"
NGN_EVENT_SLUG="${NGN_EVENT_SLUG:-}"
NGN_TICKET_TYPE_ID="${NGN_TICKET_TYPE_ID:-}"

require_var() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "$value" ]]; then
    echo "Missing required env var: $name" >&2
    exit 1
  fi
}

for v in ATTENDEE_TOKEN ORGANIZER_TOKEN EUR_EVENT_ID EUR_EVENT_SLUG EUR_TICKET_TYPE_ID NGN_EVENT_ID NGN_EVENT_SLUG NGN_TICKET_TYPE_ID; do
  require_var "$v"
done

json_field() {
  local json="$1"
  local key="$2"
  node -e "const o=JSON.parse(process.argv[1]); const v=o[process.argv[2]]; if(v===undefined||v===null){process.exit(2)}; process.stdout.write(String(v));" "$json" "$key"
}

request_offer() {
  local event_id="$1"
  local ticket_type_id="$2"
  local offered_price="$3"
  curl -sS -X POST "${API_BASE_URL}/api/events/${event_id}/ticket-types/${ticket_type_id}/offers" \
    -H "Authorization: Bearer ${ATTENDEE_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"offeredPrice\":\"${offered_price}\"}"
}

accept_offer() {
  local offer_id="$1"
  curl -sS -X POST "${API_BASE_URL}/api/offers/${offer_id}/accept" \
    -H "Authorization: Bearer ${ORGANIZER_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{}'
}

reject_offer() {
  local offer_id="$1"
  curl -sS -X POST "${API_BASE_URL}/api/offers/${offer_id}/reject" \
    -H "Authorization: Bearer ${ORGANIZER_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"organizerNote":"Try another amount."}'
}

checkout_quote() {
  local slug="$1"
  local ticket_type_id="$2"
  local offer_request_id="$3"
  local offer_unlock_token="$4"
  curl -sS -X POST "${API_BASE_URL}/api/orders/quote" \
    -H "Authorization: Bearer ${ATTENDEE_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"eventSlug\":\"${slug}\",\"items\":[{\"ticketTypeId\":\"${ticket_type_id}\",\"quantity\":1}],\"offerRequestId\":\"${offer_request_id}\",\"offerUnlockToken\":\"${offer_unlock_token}\"}"
}

create_checkout() {
  local slug="$1"
  local ticket_type_id="$2"
  local offer_request_id="$3"
  local offer_unlock_token="$4"
  curl -sS -X POST "${API_BASE_URL}/api/orders/checkout" \
    -H "Authorization: Bearer ${ATTENDEE_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"eventSlug\":\"${slug}\",\"items\":[{\"ticketTypeId\":\"${ticket_type_id}\",\"quantity\":1}],\"offerRequestId\":\"${offer_request_id}\",\"offerUnlockToken\":\"${offer_unlock_token}\"}"
}

echo "[EUR] happy path"
eur_offer_json="$(request_offer "$EUR_EVENT_ID" "$EUR_TICKET_TYPE_ID" "35.00")"
eur_offer_id="$(json_field "$eur_offer_json" "id")"
accept_eur_json="$(accept_offer "$eur_offer_id")"
eur_unlock_token="$(json_field "$accept_eur_json" "checkoutUnlockToken")"

quote_json="$(checkout_quote "$EUR_EVENT_SLUG" "$EUR_TICKET_TYPE_ID" "$eur_offer_id" "$eur_unlock_token")"
json_field "$quote_json" "totalAmount" >/dev/null

checkout_json="$(create_checkout "$EUR_EVENT_SLUG" "$EUR_TICKET_TYPE_ID" "$eur_offer_id" "$eur_unlock_token")"
json_field "$checkout_json" "id" >/dev/null

echo "[EUR] replay token failure"
replay_json="$(create_checkout "$EUR_EVENT_SLUG" "$EUR_TICKET_TYPE_ID" "$eur_offer_id" "$eur_unlock_token" || true)"
if ! echo "$replay_json" | grep -Eqi "already been used|invalid|not accepted"; then
  echo "Expected replay-token failure not observed" >&2
  exit 1
fi

echo "[EUR] out-of-range failure"
out_of_range_json="$(request_offer "$EUR_EVENT_ID" "$EUR_TICKET_TYPE_ID" "99999.00" || true)"
if ! echo "$out_of_range_json" | grep -qi "between"; then
  echo "Expected out-of-range failure not observed" >&2
  exit 1
fi

echo "[NGN] rejected path"
ngn_offer_json="$(request_offer "$NGN_EVENT_ID" "$NGN_TICKET_TYPE_ID" "5000.00")"
ngn_offer_id="$(json_field "$ngn_offer_json" "id")"
reject_offer "$ngn_offer_id" >/dev/null

post_reject_checkout="$(create_checkout "$NGN_EVENT_SLUG" "$NGN_TICKET_TYPE_ID" "$ngn_offer_id" "invalid-token" || true)"
if ! echo "$post_reject_checkout" | grep -Eqi "invalid|accepted|not accepted"; then
  echo "Expected rejected/invalid-token failure not observed" >&2
  exit 1
fi

echo "[NGN] accepted path"
ngn_offer_json_2="$(request_offer "$NGN_EVENT_ID" "$NGN_TICKET_TYPE_ID" "7000.00")"
ngn_offer_id_2="$(json_field "$ngn_offer_json_2" "id")"
accept_ngn_json="$(accept_offer "$ngn_offer_id_2")"
ngn_unlock_token_2="$(json_field "$accept_ngn_json" "checkoutUnlockToken")"

quote_ngn_json="$(checkout_quote "$NGN_EVENT_SLUG" "$NGN_TICKET_TYPE_ID" "$ngn_offer_id_2" "$ngn_unlock_token_2")"
json_field "$quote_ngn_json" "currency" >/dev/null

echo "All offer-range EUR/NGN API E2E checks passed."
