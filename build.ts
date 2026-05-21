export async function 
build(): Promise<Boolean> {
    const glob = new Bun.Glob("**/*.{ts,vue}");
    const files = await Array.fromAsync(glob.scan({ cwd: "./src" }));
    const entrypoints = files.map(file => `./src/${file}`);

    console.log(`[build] Building: [${files.join(",")}]...`)
    const r = await Bun.build({
        outdir: "./public/scripts",
        target: "browser",
        entrypoints,
    })
    if(r.logs.length>0){
        console.log(r.logs)
    }
    console.log("✓ Building done!")
    return r.success;
}