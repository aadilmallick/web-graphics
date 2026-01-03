import webglbasics from "./src/index.html";

const server = Bun.serve({
  port: 3000,
  routes: {
    "/": webglbasics,
  },
});

console.log(`Listening on ${server.url}`);
