// react-router v7 usa TextEncoder/TextDecoder, que el entorno jsdom de jest no
// expone como globales. Se toman de `util` de Node antes de cargar los tests.
import { TextEncoder, TextDecoder } from "util";

Object.assign(globalThis, { TextEncoder, TextDecoder });

import "@testing-library/jest-dom";
