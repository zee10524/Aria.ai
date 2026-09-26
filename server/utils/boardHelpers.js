"use strict";

// Maximum number of elements stored on a single board.
const MAX_BOARD_ELEMENTS = 5000;

// Allowed element types per the wire contract.
const ALLOWED_TYPES = new Set(["pen", "rect", "ellipse", "line", "arrow", "text"]);

/**
 * Validates a BoardElement payload received from the client.
 * Returns null when the element is valid.
 * Returns an error-message string when invalid; the caller should refuse and
 * store nothing.
 *
 * Checked: non-empty string id, allowed type, string color, numeric width,
 * and the coordinate fields required by the element's type.
 *
 * @param {unknown} el
 * @returns {string|null}
 */
function validateElement(el) {
  if (!el || typeof el !== "object" || Array.isArray(el)) {
    return "element must be an object";
  }
  if (typeof el.id !== "string" || el.id.length === 0) {
    return "element.id must be a non-empty string";
  }
  if (!ALLOWED_TYPES.has(el.type)) {
    return `element.type must be one of ${[...ALLOWED_TYPES].join(", ")}`;
  }
  if (typeof el.color !== "string") {
    return "element.color must be a string";
  }
  if (typeof el.width !== "number") {
    return "element.width must be a number";
  }
  switch (el.type) {
    case "pen":
      if (!Array.isArray(el.points) || el.points.length === 0) {
        return "pen element requires a non-empty points array";
      }
      for (const p of el.points) {
        if (typeof p.x !== "number" || typeof p.y !== "number") {
          return "pen points must have numeric x and y";
        }
      }
      break;
    case "rect":
    case "ellipse":
    case "text":
      if (
        typeof el.x !== "number" ||
        typeof el.y !== "number" ||
        typeof el.w !== "number" ||
        typeof el.h !== "number"
      ) {
        return `${el.type} element requires numeric x, y, w, h`;
      }
      break;
    case "line":
    case "arrow":
      if (
        typeof el.x1 !== "number" ||
        typeof el.y1 !== "number" ||
        typeof el.x2 !== "number" ||
        typeof el.y2 !== "number"
      ) {
        return `${el.type} element requires numeric x1, y1, x2, y2`;
      }
      break;
  }
  return null;
}

/**
 * Walks the elements array backwards and returns the id of the most recently
 * added element whose createdBy matches userId, or null when none is found.
 *
 * Both userId and element.createdBy may be plain strings or objects that
 * implement toString() (e.g. Mongoose ObjectIds), so comparison is done as
 * String(x) === String(y).
 *
 * @param {Array<{id: string, createdBy: string|object}>} elements
 * @param {string|object} userId
 * @returns {string|null}
 */
function findLastOwnedElementId(elements, userId) {
  const uid = String(userId);
  for (let i = elements.length - 1; i >= 0; i--) {
    if (String(elements[i].createdBy) === uid) {
      return elements[i].id;
    }
  }
  return null;
}

module.exports = {
  MAX_BOARD_ELEMENTS,
  ALLOWED_TYPES,
  findLastOwnedElementId,
  validateElement,
};
