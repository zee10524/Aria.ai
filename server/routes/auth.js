const router = require("express").Router();
const passport = require("passport");
const auth = require("../controllers/authController");

router.post("/register", auth.register);

router.post(
  "/login",
  passport.authenticate("local", { session: false }),
  auth.login
);

module.exports = router;
