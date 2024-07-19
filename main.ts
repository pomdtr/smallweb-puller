import { Hono } from "@hono/hono";
import { HTTPException } from "@hono/hono/http-exception";
import { z } from "zod";
import { validator } from "@hono/hono/validator";
import { err, ok, Result } from "true-myth/result";
import * as jsonc from "@std/jsonc";

async function getAppDir(
    name: string,
): Promise<Result<string, { reason: string }>> {
    const command = new Deno.Command("smallweb", {
        args: ["list", "--json"],
    });

    const { stdout, success, stderr } = await command.output();

    if (!success) {
        return err({ reason: new TextDecoder().decode(stderr) });
    }

    try {
        const apps = jsonc.parse(new TextDecoder().decode(stdout)) as {
            name: string;
            dir: string;
        }[];

        const app = apps.find((app) => app.name === name);
        if (!app) {
            return err({ reason: "App not found" });
        }

        return ok(app.dir);
    } catch (e) {
        return err({ reason: e.message });
    }
}

const app = new Hono();

app.get("/", (c) => c.text("Puller is running"));

const schema = z.object({
    app: z.string(),
});

app.post(
    "/",
    validator("json", async (value) => {
        const parsed = await schema.safeParseAsync(value);
        if (!parsed.success) {
            throw new HTTPException(400, {
                message: "Invalid request body",
            });
        }

        return parsed.data;
    }),
    async (c) => {
        const { app } = c.req.valid("json");
        const res = await getAppDir(app);
        if (!res.isOk) {
            throw new HTTPException(400, {
                message: res.error.reason,
            });
        }

        const command = new Deno.Command("git", {
            args: ["pull"],
            cwd: res.value,
        });

        const { stderr, success } = await command.output();
        if (!success) {
            throw new HTTPException(500, {
                message: new TextDecoder().decode(stderr),
            });
        }

        return c.json({ success: true });
    },
);

export default app;
