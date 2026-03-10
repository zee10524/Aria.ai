const router = require("express").Router();
const passport = require("passport");
const roomController = require("../controllers/roomController");
const messageController = require("../controllers/messageController");

const requireAuth = passport.authenticate("jwt", { session: false });

router.post("/", requireAuth, roomController.createRoom);
router.get("/mine", requireAuth, roomController.listMyRooms);
router.get("/:roomId", requireAuth, roomController.getRoomById);
router.get("/:roomId/members", requireAuth, roomController.getRoomMembers);
router.post("/join", requireAuth, roomController.joinRoomByCode);
router.post("/:roomId/leave", requireAuth, roomController.leaveRoom);
router.get("/:roomId/messages", requireAuth, messageController.getMessages);

module.exports = router;
