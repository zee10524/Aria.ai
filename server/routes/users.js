'use strict';

const router = require("express").Router();
const passport = require("passport");
const user = require("../controllers/userController");

const authenticate = passport.authenticate("jwt", { session: false });

router.get("/me", authenticate, user.getMe);
router.patch("/me", authenticate, user.patchMe);

module.exports = router;
