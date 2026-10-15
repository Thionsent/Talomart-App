import { describe, expect, it } from "vitest";

import { productImageFrameRect } from "./product-image-framing";

describe("productImageFrameRect", () => {
  const portrait = { imageWidth: 600, imageHeight: 900, frameWidth: 1200, frameHeight: 900 };

  it("fits an entire portrait photo inside a landscape product frame", () => {
    expect(productImageFrameRect({ ...portrait, fit: "contain", zoom: 1, horizontal: 50, vertical: 50 }))
      .toEqual({ x: 300, y: 0, width: 600, height: 900 });
  });

  it("lets the merchant fill the frame and move the crop", () => {
    expect(productImageFrameRect({ ...portrait, fit: "cover", zoom: 1, horizontal: 50, vertical: 100 }))
      .toEqual({ x: 0, y: -900, width: 1200, height: 1800 });
  });

  it("clamps excessive zoom and focal values", () => {
    expect(productImageFrameRect({ ...portrait, fit: "contain", zoom: 99, horizontal: -20, vertical: 200 }))
      .toEqual({ x: 0, y: -1800, width: 1800, height: 2700 });
  });
});
