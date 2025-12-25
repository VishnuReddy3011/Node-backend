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
    // Don't throw on non-2xx; we’ll handle status ourselves like in your Python code
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
  rocketcommerce: "rocketcommercem-oltp", // keeping your original mapping (note the 'm')
  campussutra: "campussutra-oltp",
};

// Dummy data (acts like DB)
//  

/* CREATE */
router.post("/", async (req, res) => {
  const newUser = {
    client: req.body.client,
    subOrderId: req.body.subOrderId,
  }

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
    query: `select wi.item_id, oso.fulfillment_location_id, oso.channel_order_id, oso.parent_order_code, oso.client_id, oso.status
          from oms.oms_sub_orders oso
          left join wms.wms_item_order wi on oso.id = wi.order_id
          where oso.id = ${req.body.subOrderId};`,
  };


  const dbResponse = await postAxios(dbUrl, {
    headers: dbHeaders,
    body: dbPayload,
  });

  if (!dbResponse.ok) {
    return res.status(500).json({ message: "Failed to fetch item details from DB." });
  }
  const records = parseTsv(dbResponse.text);

  if (records.length === 0) {
    return res.status(404).json({ message: "No records found for the given subOrderId." });
  } else if (
    records[0].status === "COMPLETED" ||
    records[0].status === "CANCELLED"
  ) {
    return res.status(400).json({ message: `The order is in ${records[0].status.toLowerCase()} status` });
  }

  const itemCodes = records.map((record) => record.item_id);

  res.status(201).json(itemCodes);
});

// /* READ ALL */
router.get("/", (req, res) => {
  res.json(clientDomainNames);
});

// /* READ BY ID */
// router.get("/:id", (req, res) => {
//   const user = users.find((u) => u.id == req.params.id);
//   if (!user) return res.status(404).json({ message: "User not found" });
//   res.json(user);
// });

// /* UPDATE */
// router.put("/:id", (req, res) => {
//   const user = users.find((u) => u.id == req.params.id);
//   if (!user) return res.status(404).json({ message: "User not found" });

//   user.name = req.body.name;
//   user.age = req.body.age;
//   res.json(user);
// });

// /* DELETE */
// router.delete("/:id", (req, res) => {
//   users = users.filter((u) => u.id != req.params.id);
//   res.json({ message: "User deleted successfully" });
// });

module.exports = router;
