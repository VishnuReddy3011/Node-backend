const express = require("express");
const router = express.Router();
const axios = require("axios");

function parseTsv(tsvText) {
  const lines = (tsvText || "")
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) return [];

  const header = lines[0].split("\t");
  return lines.slice(1).map((line) => {
    const cols = line.split("\t");
    const rec = {};
    for (let i = 0; i < header.length; i++) {
      rec[header[i]] = cols[i] ?? "";
    }
    return rec;
  });
}


async function postAxios(url, { headers = {}, body, params } = {}) {
  const res = await axios.post(url, body, {
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    params,
    responseType: "text",
    validateStatus: () => true,
  });

  const text =
    typeof res.data === "string" ? res.data : JSON.stringify(res.data);

  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // Not JSON (e.g., TSV from DB, or plain-text errors)
  }

  return {
    status: res.status,
    ok: res.status >= 200 && res.status < 300,
    text,
    json,
  };
}


const dbIds = {
  mensa: 177,
  libas: 4,
  uspl: 104,
  modenik: 426,
  theindiangarageco: 168,
  aramya: 418,
  guess: 390,
  campussutra: 336,
  indoera: 215,
  instakart: 384,
  rocketcommerce: 98,
  thimblerr: 357,
  shaktibrandz: 209,
  jghosiery: 213,
  vmart: 147, 
};

const clientDomainNames = {
  modenik: "modenik-omni",
  libas: "libas-oltp",
  mensa: "mensa-oltp",
  uspl: "uspl-oltp",
  theindiangarageco: "theindiangarageco-oltp",
  guess: "guess-omni",
  indoera: "indoera-oltp",
  aramya: "aramya-omni",
  instakart: "instakart-omni",
  rocketcommerce: "rocketcommercem-oltp", 
  campussutra: "campussutra-oltp",
  jghosiery: "jghosiery-oltp",
  vmart: "vmart-oltp",
  shaktibrandz: "shaktibrandz-oltp",
  thimblerr: "thimblerr-omni",
};



router.post("/", async (req, res) => {

  const dbUrl = "https://saas.increff.com/webget/in/api/app/sql/result";

  const dbHeaders = {
    authUsername: 'meesho-alerts-user',
    authPassword: '4533@Oi@Ul',
    authOrgName: 'increff',
  };

  const dbPayload = {
    schema: "oms",
    dbId: dbIds[req.body.client],
    clearOnQuery: "on",
    autoSuggestions: "on",
    action: "QUERY",
    query: `select wi.item_id, oso.fulfillment_location_id, oso.channel_order_id, oso.parent_order_code, oso.client_id, oso.status, wo.order_state
          from oms.oms_sub_orders oso
          left join wms.wms_item_order wi on oso.id = wi.order_id
          left join wms.wms_wms_order wo on oso.id = wo.order_id
          where oso.id = ${req.body.subOrderId};`,
  };

  const dbResponse = await postAxios(dbUrl, {
    headers: dbHeaders,
    body: dbPayload,
  });

  if (!dbResponse.ok) {
    return res
      .status(500)
      .json({
        message: "Failed to fetch item details from DB.",
        channel_order_id: records[0].channel_order_id,
        parent_order_code: records[0].parent_order_code,
      });
  }
  const records = parseTsv(dbResponse.text);

  if (records.length === 0) {
    return res
      .status(404)
      .json({
        message: "No itemCodes found for the given subOrderId.",
        channel_order_id: records[0].channel_order_id,
        parent_order_code: records[0].parent_order_code,
      });
  } else if (
    records[0].status === "COMPLETED" ||
    records[0].status === "CANCELLED" ||
    records[0].order_state === "READY_TO_DISPATCH"
  ) {
    return res.status(200).json({ message: `The order is in ${records[0].status.toLowerCase()} status` });
  }

  const itemCodes = records.map((record) => record.item_id);

  pack_headers = {
    authDomainName: clientDomainNames[req.body.client],
    authUsername: `${req.body.client}.user`,
    authPassword: "myApi@1729",
    clientId: records[0].client_id,
    warehouseid: records[0].fulfillment_location_id,
  };

  const shipmentPayload = {
    itemCodes: itemCodes,
    orderId: req.body.subOrderId
  };

  const shipmentUrl = `https://${req.body.client}.omni.increff.com/wms/pack/piece/shipment`;
  const shipmentResponse = await postAxios(shipmentUrl, {
    headers: pack_headers,
    body: shipmentPayload,
  });
  if (!shipmentResponse.ok) {
    return res
      .status(shipmentResponse.status)
      .json(shipmentResponse.json);
  }

  const shipmentId = shipmentResponse.json.id;

  const subOrderUrl = `https://${req.body.client}.omni.increff.com/wms/orders/outward/sub-orders-response`;
  const subOrderResponse = await postAxios(subOrderUrl, {
    headers: pack_headers,
    body: [req.body.subOrderId]
  });

  const packingUrl = `https://${req.body.client}.omni.increff.com/wms/pack/shipment/${shipmentId}/close`;
  const areBoxLabelsAllowed = subOrderResponse.json?.data?.[0]?.areBoxLabelsAllowed;

  const packingParams = {
    arePackBoxLabelsRequired: String(areBoxLabelsAllowed).toLowerCase(),
  };

  const packingPayload = {
    params: {
      updates: null,
      cloneFrom: null,
      encoder: {},
      map: {}
    }
  }

  const packingResponse = await postAxios(packingUrl, {
    headers: pack_headers,
    params: packingParams,
    body: packingPayload,
  });
  if (!packingResponse.ok) {
    const data = packingResponse.json;

    return res.status(packingResponse.status).json({message:data.message, channel_order_id: records[0].channel_order_id, parent_order_code: records[0].parent_order_code });
  }

  const invShippingLblUrl = `https://${req.body.client}.omni.increff.com/wms/pack/shipment/${shipmentId}/invoice-shippingLabel`;

  const invShippingLblResponse = await postAxios(invShippingLblUrl, {
    headers: pack_headers,
    body: {}
  });

  if (!invShippingLblResponse.ok) {
    const data = packingResponse.json;
    return res.status(packingResponse.status).json({message:data.message, channel_order_id: records[0].channel_order_id, parent_order_code: records[0].parent_order_code });
  }
  return res.status(200).json({ message: "Order packed successfully." });
});

module.exports = router;
