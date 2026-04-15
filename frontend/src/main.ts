import "./app.css";
import { pageRouter } from "ilha:pages";
import { registry } from "ilha:registry";
import { initLocale } from "./lib/locale";

initLocale();
pageRouter.mount("#app", { registry });
