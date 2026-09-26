// Pure helpers for the rooms domain -- no mongoose, no I/O.
// Imported by both roomController and the test suite.

const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const generateRoomCode = () => {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    const index = Math.floor(Math.random() * ROOM_CODE_ALPHABET.length);
    code += ROOM_CODE_ALPHABET[index];
  }
  return code;
};

const validateRoomFields = ({ description, tags }) => {
  if (description && description.length > 300) {
    return "Description must be 300 characters or fewer";
  }
  if (tags && tags.length > 8) {
    return "A room can have at most 8 tags";
  }
  if (tags && tags.some((t) => String(t).trim().length > 24)) {
    return "Each tag must be 24 characters or fewer";
  }
  return null;
};

// Given an array of plain room objects and a Set of room ID strings the current
// user belongs to, returns a new array with isMember annotated on each room.
const markMembership = (rooms, memberRoomIds) =>
  rooms.map((r) => ({
    ...r,
    isMember: memberRoomIds.has(String(r._id)),
  }));

module.exports = {
  ROOM_CODE_LENGTH,
  ROOM_CODE_ALPHABET,
  generateRoomCode,
  validateRoomFields,
  markMembership,
};
