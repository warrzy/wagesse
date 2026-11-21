import assert from "node:assert/strict"
import { readFileSync, statSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const root = path.resolve(import.meta.dirname, "../..")

function source(relative: string): string {
  return readFileSync(path.join(root, relative), "utf8")
}

test("la charte reprend les couleurs et le logo officiel", () => {
  const css = source("styles/globals.css")
  for (const color of ["#071D40", "#087DD1", "#FF7900", "#F4F8FC"]) {
    assert.equal(css.includes(color), true, color)
  }
  assert.match(source("components/Header.tsx"), /BrandLogo/)
  assert.match(source("components/Footer.tsx"), /tone="dark"/)
  assert.match(source("components/AuthShell.tsx"), /BrandLogo/)
  assert.match(source("app/admin/_components/AdminSidebar.tsx"), /BrandLogo/)
  assert.equal(statSync(path.join(root, "public/brand/logo.png")).size > 1000, true)
  assert.equal(statSync(path.join(root, "public/brand/logo-dark.png")).size > 1000, true)
  assert.equal(statSync(path.join(root, "public/brand/mark.png")).size > 1000, true)
  assert.equal(statSync(path.join(root, "app/icon.png")).size > 0, true)
})

test("la vidéo du hero est silencieuse, en boucle, et s'efface si le mouvement est réduit", () => {
  const hero = source("components/Hero.tsx")
  assert.match(hero, /muted/)
  assert.match(hero, /loop/)
  assert.match(hero, /playsInline/)
  assert.match(hero, /prefers-reduced-motion/)
  assert.match(hero, /carriere-poster\.jpg/)
  const video = statSync(path.join(root, "public/video/carriere.mp4"))
  assert.equal(video.size < 2_500_000, true)
  assert.match(source("docs/ux/MARQUE.md"), /Mixkit/)
})
