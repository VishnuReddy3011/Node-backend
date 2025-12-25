const express = require("express");
const router = express.Router();

// Dummy data (acts like DB)
let users = [
  { id: 1, name: "Vishnu", age: 24 },
  { id: 2, name: "Reddy", age: 25 },
];

/* CREATE */
router.post("/", (req, res) => {
  const newUser = {
    id: users.length + 1,
    name: req.body.name,
    age: req.body.age,
  };
  users.push(newUser);
  res.status(201).json(newUser);
});

/* READ ALL */
router.get("/", (req, res) => {
  res.json(users);
});

/* READ BY ID */
router.get("/:id", (req, res) => {
  const user = users.find((u) => u.id == req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

/* UPDATE */
router.put("/:id", (req, res) => {
  const user = users.find((u) => u.id == req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.name = req.body.name;
  user.age = req.body.age;
  res.json(user);
});

/* DELETE */
router.delete("/:id", (req, res) => {
  users = users.filter((u) => u.id != req.params.id);
  res.json({ message: "User deleted successfully" });
});

module.exports = router;
