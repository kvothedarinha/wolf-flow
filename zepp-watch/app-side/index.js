import { BaseSideService } from "@zeppos/zml/base-side";

// O ZML usa este serviço no app Zepp do celular para encaminhar
// as chamadas httpRequest() feitas pelo relógio.
AppSideService(BaseSideService({}));
