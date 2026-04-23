#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mario Bros terminal — pixel-art style SMB1, true-color, demi-blocs Unicode.

Rendu : chaque cellule du terminal = 1 pixel de large × 2 pixels de haut
grâce au caractère ▀ (upper half block) avec couleur FG = pixel du haut,
couleur BG = pixel du bas. Les pixels "ciel" sont laissés transparents
pour voir le fond du terminal Cursor.

Contrôles :
    ← / → ou A / D   : marcher
    ESPACE / ↑ / W   : sauter (maintiens pour sauter plus haut)
    SHIFT / X         : courir
    R                 : recommencer
    Q / ESC           : quitter

Lancer :
    python3 mario.py

Testé sur macOS avec iTerm2 / Terminal.app / Cursor intégré.
"""

from __future__ import annotations

import atexit
import os
import random
import select
import signal
import sys
import termios
import time
import tty
from typing import Dict, List, Optional, Tuple

RGB = Tuple[int, int, int]
Pixel = Optional[RGB]

# ───────────────────────────────────────────────────────────────────
#  PALETTE — couleurs NES SMB1 approximées
# ───────────────────────────────────────────────────────────────────
PAL: Dict[str, Pixel] = {
    ".": None,                 # transparent (laisse voir le terminal)
    "R": (216,  40,   0),      # rouge Mario
    "r": (152,  28,   0),      # rouge sombre
    "P": (252, 188, 176),      # chair claire
    "p": (252, 152,  56),      # chair ombre
    "B": (  0,  88, 248),      # bleu salopette
    "b": (  0,  40, 160),      # bleu sombre
    "Y": (252, 216,  72),      # jaune (boutons / pièce / ? block)
    "y": (228, 164,   0),      # jaune sombre
    "K": (  0,   0,   0),      # noir (moustache, yeux, contours)
    "W": (252, 252, 252),      # blanc
    "S": (252, 224, 168),      # beige
    "O": (172,  84,   0),      # marron (Goomba, sol)
    "o": (116,  52,   0),      # marron sombre
    "N": (228, 100,  56),      # brique
    "n": (152,  60,  28),      # brique sombre
    "G": (  0, 168,   0),      # vert (tuyau, buisson)
    "g": (  0, 104,   0),      # vert sombre
    "M": (188, 188, 188),      # gris (mât)
    "m": (116, 116, 116),      # gris sombre
    "c": (112, 208, 248),      # bleu clair (reflet pièce)
    "d": (104,  44,   0),      # brun cheveux / chaussures
}


def s(rows: str) -> List[List[Pixel]]:
    """Compile une chaîne sprite en matrice de pixels."""
    lines = [ln for ln in rows.strip("\n").split("\n")]
    w = max(len(ln) for ln in lines)
    out: List[List[Pixel]] = []
    for ln in lines:
        ln = ln.ljust(w, ".")
        out.append([PAL[c] for c in ln])
    return out


# ───────────────────────────────────────────────────────────────────
#  SPRITES 16×16 — Mario, Goomba, Koopa, pièce…
# ───────────────────────────────────────────────────────────────────
MARIO_STAND = s("""
................
......RRRRR.....
.....RRRRRRRR...
.....dddPPdP....
....dPdPPPdPPP..
....dPddPPPdPPP.
....ddPPPPdddd..
......PPPPPP....
.....RRBRRBRR...
....RRRBRRBRRR..
...PPRBBYBBYRPP.
...PPPBYBYBYPPP.
...PPBBYYYYBBPP.
.....BBB..BBB...
....ddd....ddd..
................
""")

MARIO_WALK1 = s("""
................
......RRRRR.....
.....RRRRRRRR...
.....dddPPdP....
....dPdPPPdPPP..
....dPddPPPdPPP.
....ddPPPPdddd..
......PPPPPP....
......RRBRRB....
.....RRRBRRBRR..
....PPRBBYBBYR..
.....PBYBYBYPP..
......BYYYYB....
.....BB..BBBB...
....ddd....ddd..
................
""")

MARIO_WALK2 = s("""
................
......RRRRR.....
.....RRRRRRRR...
.....dddPPdP....
....dPdPPPdPPP..
....dPddPPPdPPP.
....ddPPPPdddd..
......PPPPPP....
.....BRRBRR.....
....BBBRRBBBB...
...PPRBYBBYBRPP.
...PPPBYBYBYPPP.
....BBBYYYBBB...
...BBB......BBB.
..ddd..........d
................
""")

MARIO_JUMP = s("""
................
......RRRRR.....
.....RRRRRRRR...
.....dddPPdP....
....dPdPPPdPPP..
....dPddPPPdPPP.
....ddPPPPdddd..
....RRPPPPPPRR..
...RBRRRRRRBRR..
..RRBBBBBBBBBBR.
..PBYBBBBBBYBP..
..PPBYBBBBYBPP..
..PPBBYYYYBBPP..
....BBBBBBBB....
....dd......dd..
...ddd......ddd.
""")


def flip_h(sprite: List[List[Pixel]]) -> List[List[Pixel]]:
    return [list(reversed(row)) for row in sprite]


GOOMBA1 = s("""
................
................
....OOOOOOOO....
...OOOOOOOOOO...
..OOOOOOOOOOOO..
..WKOOOOOOOOKW..
..WKOOOOOOOOKW..
..WKKOOOOOOKKW..
..OOWOOOOOOWOO..
.OOOOOOOOOOOOOO.
.OOOOOOOOOOOOOO.
.oOoOOOOOOOOoOo.
..SSSS....SSSS..
..SSSSS..SSSSS..
...SSS....SSS...
................
""")

GOOMBA2 = s("""
................
................
....OOOOOOOO....
...OOOOOOOOOO...
..OOOOOOOOOOOO..
..WKOOOOOOOOKW..
..WKOOOOOOOOKW..
..WKKOOOOOOKKW..
..OOWOOOOOOWOO..
.OOOOOOOOOOOOOO.
.OOOOOOOOOOOOOO.
.oOoOOOOOOOOoOo.
...SSS....SSS...
..SSSSS..SSSSS..
..SSSS....SSSS..
................
""")

GOOMBA_SQUISH = s("""
................
................
................
................
................
................
................
................
....OOOOOOOO....
...OOOOOOOOOO...
..OOKOOOOOOKOO..
..WOOOOOOOOOOW..
..oOoOOOOOOOoOo.
.SSSSS....SSSSS.
..SSS......SSS..
................
""")


COIN1 = s("""
................
................
......YYYY......
.....YYYYYY.....
....YYYccYYY....
....YYYccYYY....
....YYYccYYY....
....YYYccYYY....
....YYYccYYY....
....YYYccYYY....
....YYYccYYY....
....YYYccYYY....
.....YYYYYY.....
......YYYY......
................
................
""")

COIN2 = s("""
................
................
.......YY.......
......YYYY......
......YccY......
......YccY......
......YccY......
......YccY......
......YccY......
......YccY......
......YccY......
......YccY......
......YccY......
.......YY.......
................
................
""")


# ───────────────────────────────────────────────────────────────────
#  TILES 16×16 — sol, brique, ? block, tuyau, drapeau, nuage, buisson
# ───────────────────────────────────────────────────────────────────
GROUND = s("""
NNNNnNNNNNNnNNNN
NNnNNNNNnNNNNNNN
NNNNNNNNNNNNnNNN
NnNNNNnNNNNNNNNN
nnnnnnnnnnnnnnnn
OoOoOoOoOoOoOoOo
OOOOoOOOOOoOOOOO
oOOOOOOoOOOOOOOO
OOOOOOOOOOOOOoOO
OoOoOoOoOoOoOoOo
OOOOOoOOOOOOoOOO
oOOOOOOOoOOOOOOO
OOOOOOOOOOOoOOOO
OoOoOoOoOoOoOoOo
OOOOoOOOOOoOOOOO
oOOOOOOoOOOOOOOO
""")

BRICK = s("""
nnnnnnnnnnnnnnnn
nNNNNNNnNNNNNNNn
nNNNNNNnNNNNNNNn
nNNNNNNnNNNNNNNn
nnnnnnnnnnnnnnnn
nNNnNNNNNNNNNNNn
nNNnNNNNNNNNNNNn
nNNnNNNNNNNNNNNn
nNNnNNNNNNNNNNNn
nnnnnnnnnnnnnnnn
nNNNNNNNNNNNNnNn
nNNNNNNNNNNNNnNn
nNNNNNNNNNNNNnNn
nNNNNNNNNNNNNnNn
nNNNNNNNNNNNNnNn
nnnnnnnnnnnnnnnn
""")

QBLOCK = s("""
KKKKKKKKKKKKKKKK
KYYYYYYYYYYYYYyK
KYYyYYKKKKYYyYYK
KYyYYKKyyKKYYyYK
KYYYYKKyyKKYYYYK
KYYYYKKyyKKYYYYK
KYYYKKyyyKKYYYYK
KYYYyKyyKKYYYYyK
KYYYYKyyKyYYYYYK
KYYYYyKKyyYYyYYK
KYYYYKKKKYYYYYYK
KYYYYYyyYYYyYYYK
KYYYYKKKKYYYYYYK
KYYyYYYyYYYYYYyK
KyyYYYYYYYYYYyYK
KKKKKKKKKKKKKKKK
""")

USED_BLOCK = s("""
KKKKKKKKKKKKKKKK
KnnnnnnnnnnnnnnK
KnNNNNNNNNNNNNnK
KnNNNNNNNNNNNNnK
KnNNNNNNNNNNNNnK
KnNNNNNNNNNNNNnK
KnNNNNNNNNNNNNnK
KnNNNNNNNNNNNNnK
KnNNNNNNNNNNNNnK
KnNNNNNNNNNNNNnK
KnNNNNNNNNNNNNnK
KnNNNNNNNNNNNNnK
KnNNNNNNNNNNNNnK
KnNNNNNNNNNNNNnK
KnnnnnnnnnnnnnnK
KKKKKKKKKKKKKKKK
""")

PIPE_TOP_L = s("""
.gGGGGGGGGGGGGGG
.gGGGGGGGGGGGGGG
.gGggggggggggggg
GGGGGGGGGGGGGGGG
GGGGGGGGGGGGGGGG
gggggggggggggggg
.gGGGGGGGGGGGGGG
.gGGGGGGGGGGGGGG
.gGGGGGGGGGGGGGG
.gGGGGGGGGGGGGGG
.gGGGGGGGGGGGGGG
.gGGGGGGGGGGGGGG
.gGGGGGGGGGGGGGG
.gGGGGGGGGGGGGGG
.gGGGGGGGGGGGGGG
.gGGGGGGGGGGGGGG
""")

PIPE_TOP_R = flip_h(PIPE_TOP_L)

PIPE_BODY_L = s("""
.gGGGGGGGGGGGGGG
.gGGGGGGGGGGGGGG
.gGGGGGGGGGGGGGG
.gGGGGGGGGGGGGGG
.gGGGGGGGGGGGGGG
.gGGGGGGGGGGGGGG
.gGGGGGGGGGGGGGG
.gGGGGGGGGGGGGGG
.gGGGGGGGGGGGGGG
.gGGGGGGGGGGGGGG
.gGGGGGGGGGGGGGG
.gGGGGGGGGGGGGGG
.gGGGGGGGGGGGGGG
.gGGGGGGGGGGGGGG
.gGGGGGGGGGGGGGG
.gGGGGGGGGGGGGGG
""")

PIPE_BODY_R = flip_h(PIPE_BODY_L)


BUSH = s("""
................
................
................
................
................
................
.....gg...gg....
....gGGgggGGg...
...gGGGGGGGGGg..
..gGGGGGGGGGGGg.
.gGGGGGGGGGGGGGg
gggggggggggggggg
................
................
................
................
""")

CLOUD = s("""
................
.....WWWWW......
....WWWWWWWW....
...WWWWWWWWWW...
..WWWWWWWWWWWW..
..WWWWWWWWWWWW..
...WWWWWWWWWW...
................
................
................
................
................
................
................
................
................
""")

HILL = s("""
................
................
.......gg.......
......gggg......
.....ggGGgg.....
....gGGGGGGg....
...gGGGGGGGGg...
..gGGGGGGGGGGg..
.gGGGGGGGGGGGGg.
gGGGGGGGGGGGGGGg
gggggggggggggggg
gggggggggggggggg
................
................
................
................
""")

FLAGPOLE = s("""
.......MM.......
.......MM.......
.......MM.......
.......MM.......
.......MM.......
.......MM.......
.......MM.......
.......MM.......
.......MM.......
.......MM.......
.......MM.......
.......MM.......
.......MM.......
.......MM.......
.......MM.......
.......MM.......
""")

FLAG = s("""
.......MM.......
......KMMK......
....KKKMMK......
...KKKKMMK......
..KKKKKMMK......
.KKKKKKMMK......
.KKKKKKKK.......
.KKKKKKMMK......
..KKKKKMMK......
...KKKKMMK......
....KKKMMK......
......KMMK......
.......MM.......
.......MM.......
.......MM.......
.......MM.......
""")

# Remplace les K ci-dessus par "G" (vert drapeau) — plus simple : on refait
FLAG = s("""
.......MM.......
.......MMGG.....
.......MMGGGG...
.......MMGGGGGG.
.......MMGGGGGGG
.......MMGGGGGG.
.......MMGGGG...
.......MMGG.....
.......MM.......
.......MM.......
.......MM.......
.......MM.......
.......MM.......
.......MM.......
.......MM.......
.......MM.......
""")

CASTLE_TOP = s("""
nnn..nnn..nnn..n
NnnnnNnnnnNnnnnN
NNNNnNNNNnNNNNnN
NNNNNNNNNNNNNNNN
NNnNNNNnNNNNnNNN
NNNNKKKKKKKKNNNN
NnNNKnnnnnnKNnNN
NNNNKnnnnnnKNNNN
NNnNKnnnnnnKNNNN
NNNNKKKKKKKKNnNN
NnNNNNNNNNNNNNNN
NNNNNnNNnNNNnNNN
NNnNNNNNNNnNNNNN
NNNNnNNnNNNNnNNN
NnNNNNNNNNNnNNNN
nnnnnnnnnnnnnnnn
""")


# ───────────────────────────────────────────────────────────────────
#  LEVEL MAP — compact 8 tiles de haut (128 world-px)
# ───────────────────────────────────────────────────────────────────
#   ' ' = ciel (transparent)
#   '=' = sol
#   'b' = brique
#   '?' = ? block  |  'Q' = ? block vidé
#   'P' = tuyau haut (occupe 2 tiles de large en rendu + collision)
#   'p' = tuyau corps (idem)
#   '^' = buisson   'C' = nuage   'H' = colline   'X' = château
#   'G' = spawn Goomba    'F' = drapeau    '|' = mât

LEVEL = [
    "C         H                 C          H             C              H                    C                   H        C                  ",
    "                                                                                                                                          ",
    "             ?                          bb?bb                                                                                             ",
    "     ^              ?         ^                 ^           ^^                ^^^^           ^                 F                     XXXX",
    "                                                      P               P                       G G              |                   XXXXXX",
    "                    ?    b?b?b        G              p     GG         p       G                               | |    GG         XXXXXXXX",
    "==================  ============  ======================   =====================   ====================   ==========  ==================",
    "==================  ============  ======================   =====================   ====================   ==========  ==================",
]


# ───────────────────────────────────────────────────────────────────
#  TERMINAL I/O — mode brut, lecture non bloquante, ANSI true color
# ───────────────────────────────────────────────────────────────────
ESC = "\x1b"
CSI = ESC + "["


class Terminal:
    def __init__(self) -> None:
        self.fd = sys.stdin.fileno()
        self._saved: Optional[list] = None

    def enter(self) -> None:
        self._saved = termios.tcgetattr(self.fd)
        tty.setcbreak(self.fd)
        sys.stdout.write(CSI + "?25l")      # masque le curseur
        sys.stdout.write(CSI + "?1049h")    # buffer alternatif (sauve l'écran)
        sys.stdout.write(CSI + "2J")        # clear
        sys.stdout.write(CSI + "H")         # home
        sys.stdout.flush()

    def leave(self) -> None:
        try:
            sys.stdout.write(CSI + "0m")
            sys.stdout.write(CSI + "?25h")      # affiche le curseur
            sys.stdout.write(CSI + "?1049l")    # restaure l'écran
            sys.stdout.flush()
        finally:
            if self._saved is not None:
                termios.tcsetattr(self.fd, termios.TCSADRAIN, self._saved)

    def size(self) -> Tuple[int, int]:
        try:
            cols, rows = os.get_terminal_size()
            return cols, rows
        except OSError:
            return 80, 24

    def poll_keys(self) -> List[str]:
        """Lit toutes les touches disponibles et les renvoie comme tokens."""
        keys: List[str] = []
        while True:
            r, _, _ = select.select([self.fd], [], [], 0)
            if not r:
                break
            ch = os.read(self.fd, 32)
            if not ch:
                break
            keys.extend(self._decode(ch))
        return keys

    @staticmethod
    def _decode(data: bytes) -> List[str]:
        out: List[str] = []
        i = 0
        while i < len(data):
            b = data[i]
            if b == 0x1b:
                # séquence échap
                if i + 2 < len(data) and data[i + 1] == ord("["):
                    c = chr(data[i + 2])
                    mapping = {"A": "UP", "B": "DOWN", "C": "RIGHT", "D": "LEFT"}
                    out.append(mapping.get(c, "ESC"))
                    i += 3
                    continue
                out.append("ESC")
                i += 1
            elif b == 0x20:
                out.append("SPACE")
                i += 1
            elif b == 0x0d or b == 0x0a:
                out.append("ENTER")
                i += 1
            else:
                out.append(chr(b).lower())
                i += 1
        return out


# ───────────────────────────────────────────────────────────────────
#  MONDE — parsing du niveau en objets
# ───────────────────────────────────────────────────────────────────
TILE = 16  # taille d'un tile en pixels

SOLID_TILES = {"=", "b", "?", "Q", "P", "p", "X"}


class World:
    def __init__(self, level: List[str]) -> None:
        self.rows = len(level)
        self.cols = max(len(r) for r in level)
        self.grid: List[List[str]] = []
        for r in level:
            row = list(r.ljust(self.cols, " "))
            self.grid.append(row)

        # Entités initiales : pièces dans les ? blocks, Goombas
        self.goomba_spawns: List[Tuple[int, int]] = []
        self.flag_x: int = self.cols - 4
        for y in range(self.rows):
            for x in range(self.cols):
                c = self.grid[y][x]
                if c == "G":
                    self.goomba_spawns.append((x, y))
                    self.grid[y][x] = " "
                elif c == "F":
                    self.flag_x = x

    def tile_at(self, tx: int, ty: int) -> str:
        if 0 <= ty < self.rows and 0 <= tx < self.cols:
            return self.grid[ty][tx]
        return " "

    def is_solid(self, tx: int, ty: int) -> bool:
        c = self.tile_at(tx, ty)
        if c in SOLID_TILES:
            return True
        # demi-droite du tuyau (le 'P'/'p' à gauche étend la collision)
        left = self.tile_at(tx - 1, ty)
        if left in ("P", "p"):
            return True
        return False

    def hit_block(self, tx: int, ty: int) -> Optional[str]:
        """Frappe un bloc par en dessous. Renvoie l'effet produit, ou None."""
        c = self.tile_at(tx, ty)
        if c == "?":
            self.grid[ty][tx] = "Q"
            return "coin"
        if c == "b":
            # petit Mario ne casse pas, ricoche
            return "bump"
        return None

    def pixel_width(self) -> int:
        return self.cols * TILE

    def pixel_height(self) -> int:
        return self.rows * TILE


# ───────────────────────────────────────────────────────────────────
#  ENTITÉS
# ───────────────────────────────────────────────────────────────────
class Mario:
    W, H = 12, 16  # hitbox (le sprite fait 16×16 mais le corps "utile" 12×16)

    def __init__(self, x: float, y: float) -> None:
        self.x = x              # position pixel du coin haut-gauche du sprite
        self.y = y
        self.vx = 0.0
        self.vy = 0.0
        self.on_ground = False
        self.facing = 1         # 1 = droite, -1 = gauche
        self.jump_hold = 0
        self.anim_t = 0.0
        self.dead = False
        self.invuln = 0

    def hitbox(self) -> Tuple[float, float, float, float]:
        # sprite 16×16, hitbox centrée 12×16
        return (self.x + 2, self.y, self.x + 2 + self.W, self.y + self.H)

    def sprite(self) -> List[List[Pixel]]:
        if not self.on_ground:
            sp = MARIO_JUMP
        elif abs(self.vx) < 0.2:
            sp = MARIO_STAND
        else:
            frame = int(self.anim_t * 10) % 3
            sp = [MARIO_STAND, MARIO_WALK1, MARIO_WALK2][frame]
        return sp if self.facing == 1 else flip_h(sp)


class Goomba:
    W, H = 14, 16

    def __init__(self, x: float, y: float) -> None:
        self.x = x
        self.y = y
        self.vx = -0.55
        self.vy = 0.0
        self.alive = True
        self.squish_t = 0.0
        self.anim_t = 0.0

    def hitbox(self) -> Tuple[float, float, float, float]:
        return (self.x + 1, self.y, self.x + 1 + self.W, self.y + self.H)

    def sprite(self) -> List[List[Pixel]]:
        if self.squish_t > 0:
            return GOOMBA_SQUISH
        return GOOMBA1 if int(self.anim_t * 5) % 2 == 0 else GOOMBA2


class CoinPop:
    """Pièce qui jaillit d'un ? block frappé."""
    def __init__(self, x: float, y: float) -> None:
        self.x = x
        self.y = y
        self.vy = -3.5
        self.t = 0.0
        self.alive = True

    def sprite(self) -> List[List[Pixel]]:
        return COIN1 if int(self.t * 15) % 2 == 0 else COIN2


# ───────────────────────────────────────────────────────────────────
#  PHYSIQUE
# ───────────────────────────────────────────────────────────────────
GRAVITY = 0.55
MAX_FALL = 9.0
WALK_ACC = 0.35
RUN_ACC = 0.55
WALK_MAX = 3.8
RUN_MAX = 6.0
FRICTION = 0.25
JUMP_V = -7.6
JUMP_HOLD_V = -0.42
JUMP_HOLD_MAX = 14   # frames


def aabb_overlap(a: Tuple[float, float, float, float],
                 b: Tuple[float, float, float, float]) -> bool:
    return a[0] < b[2] and a[2] > b[0] and a[1] < b[3] and a[3] > b[1]


def move_and_collide(ent, dx: float, dy: float, world: World) -> Tuple[bool, bool, List[Tuple[int, int]]]:
    """Déplace l'entité en X puis Y, en résolvant les collisions avec les tiles solides.
    Retourne (hit_y_top, hit_y_bottom, list_blocs_touchés_tête)."""
    # X
    ent.x += dx
    x0, y0, x1, y1 = ent.hitbox() if hasattr(ent, "hitbox") else (ent.x, ent.y, ent.x + ent.W, ent.y + ent.H)
    if dx > 0:
        tx = int(x1) // TILE
        for ty in range(int(y0) // TILE, int(y1 - 0.01) // TILE + 1):
            if world.is_solid(tx, ty):
                ent.x = tx * TILE - (x1 - ent.x)
                if hasattr(ent, "vx"):
                    ent.vx = 0
                break
    elif dx < 0:
        tx = int(x0) // TILE
        for ty in range(int(y0) // TILE, int(y1 - 0.01) // TILE + 1):
            if world.is_solid(tx, ty):
                ent.x = (tx + 1) * TILE - (x0 - ent.x)
                if hasattr(ent, "vx"):
                    ent.vx = 0
                break

    # Y
    ent.y += dy
    hit_top = False
    hit_bottom = False
    head_hits: List[Tuple[int, int]] = []
    x0, y0, x1, y1 = ent.hitbox() if hasattr(ent, "hitbox") else (ent.x, ent.y, ent.x + ent.W, ent.y + ent.H)
    if dy > 0:
        ty = int(y1) // TILE
        for tx in range(int(x0) // TILE, int(x1 - 0.01) // TILE + 1):
            if world.is_solid(tx, ty):
                ent.y = ty * TILE - (y1 - ent.y)
                if hasattr(ent, "vy"):
                    ent.vy = 0
                hit_bottom = True
                break
    elif dy < 0:
        ty = int(y0) // TILE
        for tx in range(int(x0) // TILE, int(x1 - 0.01) // TILE + 1):
            if world.is_solid(tx, ty):
                ent.y = (ty + 1) * TILE - (y0 - ent.y)
                if hasattr(ent, "vy"):
                    ent.vy = 0
                hit_top = True
                head_hits.append((tx, ty))
                break

    return hit_top, hit_bottom, head_hits


# ───────────────────────────────────────────────────────────────────
#  RENDU — pixel buffer + demi-blocs ANSI
# ───────────────────────────────────────────────────────────────────
class Renderer:
    def __init__(self) -> None:
        self.w = 0
        self.h = 0
        self.pix_w = 0
        self.pix_h = 0
        self.zoom = 1           # world-pixels par pixel-buffer (1 = natif)
        self.zoom_user = 0      # override manuel (+/-) ; 0 = auto
        self.buf: List[List[Pixel]] = []

    def _auto_zoom(self) -> int:
        """Choisit un zoom pour afficher ~3-4 tiles verticalement en moyenne."""
        if self.pix_h <= 0:
            return 1
        # on vise ~50 world-px visibles verticalement (= ~3 tiles)
        z = -(-50 // self.pix_h)  # ceil(50 / pix_h)
        return max(1, min(z, 6))

    def resize(self, cols: int, rows: int) -> None:
        self.w = cols
        self.h = rows
        self.pix_w = cols
        self.pix_h = (rows - 1) * 2  # on garde 1 ligne pour le HUD
        auto = self._auto_zoom()
        self.zoom = self.zoom_user if self.zoom_user > 0 else auto
        self.buf = [[None] * self.pix_w for _ in range(self.pix_h)]

    def clear(self) -> None:
        for row in self.buf:
            for i in range(len(row)):
                row[i] = None

    def blit(self, sprite: List[List[Pixel]], world_px: int, world_py: int) -> None:
        """Dessine un sprite avec sous-échantillonnage selon self.zoom.
        world_px / world_py sont des coordonnées en pixels-monde (non divisées)."""
        z = self.zoom
        sh = len(sprite)
        sw = len(sprite[0]) if sh else 0
        if z == 1:
            tx, ty = world_px, world_py
            bh, bw = sh, sw
            for j in range(bh):
                yy = ty + j
                if yy < 0 or yy >= self.pix_h:
                    continue
                row_src = sprite[j]
                row_dst = self.buf[yy]
                for i in range(bw):
                    xx = tx + i
                    if xx < 0 or xx >= self.pix_w:
                        continue
                    p = row_src[i]
                    if p is not None:
                        row_dst[xx] = p
            return

        # zoom ≥ 2 : on sous-échantillonne (nearest-neighbor, offset centré)
        if world_px >= 0:
            tx = world_px // z
        else:
            tx = -((-world_px + z - 1) // z)
        if world_py >= 0:
            ty = world_py // z
        else:
            ty = -((-world_py + z - 1) // z)
        bh = sh // z
        bw = sw // z
        start = z // 2  # offset de centrage
        for j in range(bh):
            yy = ty + j
            if yy < 0 or yy >= self.pix_h:
                continue
            sy = min(j * z + start, sh - 1)
            row_src = sprite[sy]
            row_dst = self.buf[yy]
            for i in range(bw):
                xx = tx + i
                if xx < 0 or xx >= self.pix_w:
                    continue
                sx = min(i * z + start, sw - 1)
                p = row_src[sx]
                if p is not None:
                    row_dst[xx] = p

    def flush(self, hud: str) -> None:
        out: List[str] = [CSI + "H"]
        cur_fg: Optional[RGB] = None
        cur_bg: Optional[RGB] = None
        reset_active = False

        for row_idx in range(self.h - 1):
            top_y = row_idx * 2
            bot_y = top_y + 1
            top_row = self.buf[top_y] if top_y < self.pix_h else [None] * self.pix_w
            bot_row = self.buf[bot_y] if bot_y < self.pix_h else [None] * self.pix_w

            for x in range(self.pix_w):
                top = top_row[x]
                bot = bot_row[x]

                if top is None and bot is None:
                    # pixel entièrement transparent : reset avant l'espace
                    if cur_fg is not None or cur_bg is not None or not reset_active:
                        out.append(CSI + "0m")
                        cur_fg = cur_bg = None
                        reset_active = True
                    out.append(" ")
                    continue

                if top is not None and bot is None:
                    # demi haut visible, demi bas transparent → ▀ avec FG=top, BG reset
                    if reset_active or cur_bg is not None:
                        out.append(CSI + "49m")
                        cur_bg = None
                        reset_active = False
                    if top != cur_fg:
                        out.append(CSI + "38;2;%d;%d;%dm" % top)
                        cur_fg = top
                    out.append("▀")
                    continue

                if top is None and bot is not None:
                    # demi haut transparent, demi bas visible → ▄ avec FG=bot
                    if reset_active or cur_bg is not None:
                        out.append(CSI + "49m")
                        cur_bg = None
                        reset_active = False
                    if bot != cur_fg:
                        out.append(CSI + "38;2;%d;%d;%dm" % bot)
                        cur_fg = bot
                    out.append("▄")
                    continue

                # les deux opaques
                if top != cur_fg:
                    out.append(CSI + "38;2;%d;%d;%dm" % top)
                    cur_fg = top
                if bot != cur_bg:
                    out.append(CSI + "48;2;%d;%d;%dm" % bot)
                    cur_bg = bot
                    reset_active = False
                out.append("▀")
            out.append(CSI + "0m")
            cur_fg = cur_bg = None
            reset_active = True
            out.append("\n")

        # HUD sur la dernière ligne
        out.append(CSI + "0m")
        out.append(CSI + "48;2;0;0;0m")
        out.append(CSI + "38;2;252;252;252m")
        out.append(hud.ljust(self.w)[: self.w])
        out.append(CSI + "0m")

        sys.stdout.write("".join(out))
        sys.stdout.flush()


# ───────────────────────────────────────────────────────────────────
#  TILE RENDER — dispatch d'un caractère de niveau vers un sprite
# ───────────────────────────────────────────────────────────────────
TILE_SPRITES: Dict[str, List[List[Pixel]]] = {
    "=": GROUND,
    "b": BRICK,
    "?": QBLOCK,
    "Q": USED_BLOCK,
    "P": PIPE_TOP_L,      # rendu avec le suivant → on gère en paire
    "p": PIPE_BODY_L,
    "^": BUSH,
    "C": CLOUD,
    "H": HILL,
    "F": FLAGPOLE,
    "|": FLAGPOLE,
    "X": CASTLE_TOP,
}


# ───────────────────────────────────────────────────────────────────
#  GAME
# ───────────────────────────────────────────────────────────────────
class Game:
    def __init__(self) -> None:
        self.term = Terminal()
        self.renderer = Renderer()
        self.reset()

    def reset(self) -> None:
        self.world = World(LEVEL)
        spawn_y = 0
        for y in range(self.world.rows):
            if self.world.tile_at(1, y) == "=":
                spawn_y = y * TILE - 16
                break
        self.mario = Mario(2 * TILE, spawn_y)
        self.goombas: List[Goomba] = []
        for (tx, ty) in self.world.goomba_spawns:
            # place le goomba juste au-dessus du sol le plus proche
            gy = ty
            while gy < self.world.rows and not self.world.is_solid(tx, gy + 1):
                gy += 1
            self.goombas.append(Goomba(tx * TILE, gy * TILE))
        self.coin_pops: List[CoinPop] = []
        self.score = 0
        self.coins = 0
        self.lives = 3
        self.time_left = 300.0
        self.camera_x = 0.0
        self.camera_y = float(self.world.pixel_height())  # ancré au sol au départ
        self.status = "play"   # play / dead / win
        self.win_anim = 0.0

    # ── input ──────────────────────────────────────────────────
    def process_input(self, keys: List[str]) -> Tuple[int, bool, bool]:
        dx_input = 0
        jump_held = False
        run = False
        for k in keys:
            if k in ("q", "ESC"):
                raise SystemExit
            if k == "r":
                self.reset()
                return 0, False, False
            if k in ("+", "="):
                # zoom avant = sprites plus grands = zoom numérique plus bas
                z = self.renderer.zoom_user or self.renderer.zoom
                self.renderer.zoom_user = max(1, z - 1)
                self.renderer.zoom = self.renderer.zoom_user
            if k in ("-", "_"):
                z = self.renderer.zoom_user or self.renderer.zoom
                self.renderer.zoom_user = min(6, z + 1)
                self.renderer.zoom = self.renderer.zoom_user

        # Pour l'état tenu, on utilise un petit truc : chaque touche lue
        # rafraichit un compteur. On gère ça via self._hold.
        if not hasattr(self, "_hold"):
            self._hold = {"left": 0, "right": 0, "jump": 0, "run": 0}

        # durée pendant laquelle une touche reste "enfoncée" après la dernière
        # réception d'un événement clavier. Le délai de répétition initial sous
        # macOS est ~500 ms : en 60 FPS on met 30 frames pour bridger le gap.
        HOLD = 30
        for k in keys:
            if k in ("LEFT", "a"):
                self._hold["left"] = HOLD
            elif k in ("RIGHT", "d"):
                self._hold["right"] = HOLD
            elif k in ("UP", "w", "SPACE"):
                self._hold["jump"] = HOLD
            elif k in ("x", "SHIFT"):
                self._hold["run"] = HOLD

        if self._hold["left"] > 0:
            dx_input -= 1
            self._hold["left"] -= 1
        if self._hold["right"] > 0:
            dx_input += 1
            self._hold["right"] -= 1
        if self._hold["jump"] > 0:
            jump_held = True
            self._hold["jump"] -= 1
        if self._hold["run"] > 0:
            run = True
            self._hold["run"] -= 1

        return dx_input, jump_held, run

    # ── update ─────────────────────────────────────────────────
    def update(self, dt: float, dx_input: int, jump_held: bool, run: bool) -> None:
        if self.status != "play":
            self.win_anim += dt
            return

        self.time_left -= dt
        if self.time_left <= 0:
            self.time_left = 0
            self._hurt_mario()

        m = self.mario
        m.anim_t += dt * (3 if run else 2)

        # Horizontal
        acc = RUN_ACC if run else WALK_ACC
        vmax = RUN_MAX if run else WALK_MAX
        if dx_input != 0:
            m.vx += acc * dx_input
            m.facing = dx_input
            if m.vx > vmax:
                m.vx = vmax
            if m.vx < -vmax:
                m.vx = -vmax
        else:
            if m.vx > 0:
                m.vx = max(0.0, m.vx - FRICTION)
            elif m.vx < 0:
                m.vx = min(0.0, m.vx + FRICTION)

        # Saut
        if jump_held and m.on_ground:
            m.vy = JUMP_V
            m.on_ground = False
            m.jump_hold = JUMP_HOLD_MAX
        elif jump_held and m.jump_hold > 0 and m.vy < 0:
            m.vy += JUMP_HOLD_V
            m.jump_hold -= 1
        else:
            m.jump_hold = 0

        # Gravité
        m.vy += GRAVITY
        if m.vy > MAX_FALL:
            m.vy = MAX_FALL

        # Intégration + collision
        _, hit_bottom_x, _ = move_and_collide(m, m.vx, 0, self.world)
        hit_top, hit_bottom, head = move_and_collide(m, 0, m.vy, self.world)
        m.on_ground = hit_bottom
        if hit_top:
            m.vy = 0.5
            for (tx, ty) in head:
                effect = self.world.hit_block(tx, ty)
                if effect == "coin":
                    self.score += 200
                    self.coins += 1
                    self.coin_pops.append(CoinPop(tx * TILE, ty * TILE - 8))

        # Chute dans le vide
        if m.y > self.world.pixel_height() + 40:
            self._hurt_mario()

        # Goombas
        for g in self.goombas:
            if not g.alive:
                continue
            if g.squish_t > 0:
                g.squish_t -= dt
                if g.squish_t <= 0:
                    g.alive = False
                continue
            g.anim_t += dt
            g.vy += GRAVITY
            if g.vy > MAX_FALL:
                g.vy = MAX_FALL
            # avant d'avancer, teste s'il y a un mur devant
            old_x = g.x
            move_and_collide(g, g.vx, 0, self.world)
            if g.x == old_x and g.vx != 0:
                g.vx = -g.vx
            _, hit_b, _ = move_and_collide(g, 0, g.vy, self.world)
            if hit_b:
                g.vy = 0

            # collision avec Mario
            if aabb_overlap(m.hitbox(), g.hitbox()) and m.invuln <= 0:
                mb = m.hitbox()
                gb = g.hitbox()
                if m.vy > 0 and mb[3] - gb[1] < 10:
                    # stomp !
                    g.squish_t = 0.3
                    g.vx = 0
                    m.vy = JUMP_V * 0.6
                    self.score += 100
                else:
                    self._hurt_mario()

        # Pièces volantes (depuis blocs ?)
        for c in self.coin_pops:
            if not c.alive:
                continue
            c.t += dt
            c.y += c.vy
            c.vy += GRAVITY * 0.8
            if c.t > 0.6:
                c.alive = False
        self.coin_pops = [c for c in self.coin_pops if c.alive]

        # Invulnérabilité
        if m.invuln > 0:
            m.invuln -= 1

        # Drapeau
        flag_px = self.world.flag_x * TILE
        if m.x + 8 >= flag_px:
            self.status = "win"
            self.score += int(self.time_left) * 50

        # Le viewport couvre pix_w × zoom world-pixels en largeur,
        # et pix_h × zoom world-pixels en hauteur.
        z = self.renderer.zoom
        view_w_world = self.renderer.pix_w * z
        view_h_world = self.renderer.pix_h * z

        # Caméra X
        target_x = m.x - view_w_world * 0.35
        self.camera_x += (target_x - self.camera_x) * 0.25
        if self.camera_x < 0:
            self.camera_x = 0.0
        max_cam_x = max(0, self.world.pixel_width() - view_w_world)
        if self.camera_x > max_cam_x:
            self.camera_x = max_cam_x

        # Caméra Y
        world_h = self.world.pixel_height()
        if view_h_world >= world_h:
            self.camera_y = float(world_h - view_h_world)
        else:
            target_y = m.y - view_h_world * 0.55
            min_cam_y = -20.0
            max_cam_y = float(world_h - view_h_world + 8)
            if target_y < min_cam_y:
                target_y = min_cam_y
            if target_y > max_cam_y:
                target_y = max_cam_y
            self.camera_y += (target_y - self.camera_y) * 0.25

    def _hurt_mario(self) -> None:
        m = self.mario
        if m.invuln > 0:
            return
        self.lives -= 1
        if self.lives <= 0:
            self.status = "dead"
            return
        # respawn simple au début
        spawn_y = 0
        for y in range(self.world.rows):
            if self.world.tile_at(1, y) == "=":
                spawn_y = y * TILE - 16
                break
        m.x = max(self.camera_x + 16, 2 * TILE)
        m.y = spawn_y
        m.vx = m.vy = 0
        m.invuln = 90
        self.time_left = max(60, self.time_left)

    # ── render ─────────────────────────────────────────────────
    def render(self) -> None:
        r = self.renderer
        r.clear()
        cam_px = int(self.camera_x)
        cam_py = int(self.camera_y)

        # Décor (arrière-plan) : hills, bushes, clouds
        for y in range(self.world.rows):
            for x in range(self.world.cols):
                c = self.world.grid[y][x]
                if c in ("C", "H", "^"):
                    r.blit(TILE_SPRITES[c], x * TILE - cam_px, y * TILE - cam_py)

        # Tiles solides + castle + flag
        vw = r.pix_w * r.zoom
        vh = r.pix_h * r.zoom
        for y in range(self.world.rows):
            for x in range(self.world.cols):
                c = self.world.grid[y][x]
                px = x * TILE - cam_px
                if px < -TILE or px > vw:
                    continue
                py = y * TILE - cam_py
                if py < -TILE or py > vh:
                    continue
                if c == "=":
                    r.blit(GROUND, px, py)
                elif c == "b":
                    r.blit(BRICK, px, py)
                elif c == "?":
                    r.blit(QBLOCK, px, py)
                elif c == "Q":
                    r.blit(USED_BLOCK, px, py)
                elif c == "P":
                    r.blit(PIPE_TOP_L, px, py)
                    r.blit(PIPE_TOP_R, px + TILE, py)
                elif c == "p":
                    r.blit(PIPE_BODY_L, px, py)
                    r.blit(PIPE_BODY_R, px + TILE, py)
                elif c == "X":
                    r.blit(CASTLE_TOP, px, py)
                elif c == "F":
                    r.blit(FLAG, px, py)
                elif c == "|":
                    r.blit(FLAGPOLE, px, py)

        # Coin pops
        for cp in self.coin_pops:
            r.blit(cp.sprite(), int(cp.x) - cam_px, int(cp.y) - cam_py)

        # Goombas
        for g in self.goombas:
            if not g.alive:
                continue
            r.blit(g.sprite(), int(g.x) - cam_px, int(g.y) - cam_py)

        # Mario (clignote si invuln)
        if not (self.mario.invuln > 0 and (self.mario.invuln // 3) % 2 == 0):
            r.blit(self.mario.sprite(), int(self.mario.x) - cam_px, int(self.mario.y) - cam_py)

        # HUD
        t = int(self.time_left)
        hud = f" MARIO  ●x{self.coins:02d}  SCORE {self.score:06d}  TIME {t:03d}  ♥x{self.lives}  z{r.zoom}  [←→][ESPACE][X]run [+/-]zoom [R]restart [Q]quit "
        if self.status == "dead":
            hud = " ☠  GAME OVER  —  [R] rejouer   [Q] quitter " + " " * 20
        elif self.status == "win":
            hud = f" ✦ NIVEAU TERMINÉ ✦   SCORE {self.score:06d}   —  [R] rejouer   [Q] quitter "
        r.flush(hud)

    # ── main loop ──────────────────────────────────────────────
    def run(self) -> None:
        self.term.enter()
        atexit.register(self.term.leave)
        signal.signal(signal.SIGINT, lambda *_: (_ for _ in ()).throw(SystemExit))

        TARGET = 1.0 / 60
        last = time.time()
        try:
            while True:
                cols, rows = self.term.size()
                if (cols, rows - 1) != (self.renderer.pix_w, self.renderer.pix_h // 2):
                    self.renderer.resize(cols, rows)
                    # ancre la caméra Y sur le sol au redimensionnement
                    wh = self.world.pixel_height()
                    vh = self.renderer.pix_h * self.renderer.zoom
                    self.camera_y = float(max(-20, wh - vh + 8))
                if self.renderer.pix_w < 40 or self.renderer.pix_h < 10:
                    sys.stdout.write(CSI + "H" + CSI + "2J")
                    sys.stdout.write("Agrandis le terminal (min 40x6).\n")
                    sys.stdout.flush()
                    time.sleep(0.5)
                    continue

                keys = self.term.poll_keys()
                dx, jump, run = self.process_input(keys)
                now = time.time()
                dt = min(now - last, 1 / 15)
                last = now
                self.update(dt, dx, jump, run)
                self.render()

                elapsed = time.time() - last
                if elapsed < TARGET:
                    time.sleep(TARGET - elapsed)
        except SystemExit:
            pass
        finally:
            self.term.leave()


def main() -> None:
    Game().run()


if __name__ == "__main__":
    main()
