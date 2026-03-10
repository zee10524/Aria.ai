const router = require("express").Router();
const passport = require("passport");
const auth = require("../controllers/authController");

router.post("/send-code", auth.sendCode);
router.post("/verify-code", auth.verifyCode);
router.post("/complete-signup", auth.completeSignup);

router.post(
  "/login",
  passport.authenticate("local", { session: false }),
  auth.login
);

router.get(
  "/protected",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    res.json({ user: req.user });
  }
);

module.exports = router;