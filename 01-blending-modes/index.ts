import blendah from "./src/blendah.html";

const server = Bun.serve({
    port: 3000,
    routes: {
        "/": blendah,
    },
});

console.log(`Listening on ${server.url}`);
