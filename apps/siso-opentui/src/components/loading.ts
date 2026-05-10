import { centerText, fit } from "../ui/layout";

export function loadingBody(frame: number, width: number) {
  const spin = ["◐", "◓", "◑", "◒"][frame % 4];
  return [
    "",
    centerText("SISO", width),
    centerText("OpenTUI workspace", width),
    "",
    centerText(`${spin} Loading local SISO state`, width),
    centerText("profile · bifrost · child runs", width),
    "",
    centerText("q exits", width),
  ].map((row) => fit(row, width)).join("\n");
}
