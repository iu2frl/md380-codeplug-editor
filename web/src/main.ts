import "./style.css";
import { EditorStore } from "./state/store";
import { renderApp } from "./ui/render";

const app = document.querySelector<HTMLElement>("#app");

if (!app) {
  throw new Error("Unable to find app root element.");
}

renderApp(app, new EditorStore());
