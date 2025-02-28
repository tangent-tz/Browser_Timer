import Mellowtel from "mellowtel";

(async () => {
    const mellowtel = new Mellowtel('14b804d8');
    await mellowtel.initContentScript();
})();
