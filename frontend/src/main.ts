import "./app.css";
import { mount } from "ilha";
import { pageRouter } from "ilha:pages";
import { registry } from "ilha:registry";
import { initLocale } from "./lib/locale";
import header from "./islands/header";

initLocale();
mount({ header });
pageRouter.mount("#app", { registry });
