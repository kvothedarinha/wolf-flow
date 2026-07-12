import { BasePage } from "@zeppos/zml/base-page";
import { createWidget, deleteWidget, widget, align } from "@zos/ui";
import { localStorage } from "@zos/storage";
import { getDeviceInfo } from "@zos/device";
import { API_URL } from "../utils/config";

const { width: W, height: H } = getDeviceInfo();

const COLOR_BG = 0x000000;
const COLOR_TEXT = 0xffffff;
const COLOR_MUTED = 0x8a949c;
const COLOR_ACCENT = 0x46e0cd;
const COLOR_DANGER = 0xe05a5a;
const COLOR_CARD = 0x1a2226;

const TOKEN_KEY = "tf-token";

function todayKey() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

Page(
  BasePage({
    state: {
      token: null,
      widgets: [],
      code: [0, 0, 0, 0, 0, 0],
      data: null,
      loading: false,
    },

    onInit() {
      this.state.token = localStorage.getItem(TOKEN_KEY, null);
    },

    build() {
      createWidget(widget.FILL_RECT, { x: 0, y: 0, w: W, h: H, color: COLOR_BG });
      if (this.state.token) this.loadToday();
      else this.renderPairing();
    },

    clear() {
      for (const w of this.state.widgets) deleteWidget(w);
      this.state.widgets = [];
    },

    add(type, props) {
      const w = createWidget(type, props);
      this.state.widgets.push(w);
      return w;
    },

    // ---------- pareamento ----------
    renderPairing() {
      this.clear();
      this.add(widget.TEXT, {
        x: 0,
        y: 28,
        w: W,
        h: 40,
        text: "Track Flow",
        text_size: 30,
        color: COLOR_ACCENT,
        align_h: align.CENTER_H,
      });
      this.add(widget.TEXT, {
        x: 20,
        y: 72,
        w: W - 40,
        h: 60,
        text: "Digite o código gerado em\nPerfil > Relógio > Parear",
        text_size: 20,
        color: COLOR_MUTED,
        align_h: align.CENTER_H,
      });

      const cellW = 52;
      const startX = Math.round((W - cellW * 6) / 2);
      this.state.digitWidgets = [];
      for (let i = 0; i < 6; i++) {
        const btn = this.add(widget.BUTTON, {
          x: startX + i * cellW + 3,
          y: 150,
          w: cellW - 6,
          h: 64,
          text: String(this.state.code[i]),
          text_size: 30,
          radius: 12,
          normal_color: COLOR_CARD,
          press_color: 0x2a3a40,
          color: COLOR_TEXT,
          click_func: () => {
            this.state.code[i] = (this.state.code[i] + 1) % 10;
            this.renderPairing();
          },
        });
        this.state.digitWidgets.push(btn);
      }
      this.add(widget.TEXT, {
        x: 0,
        y: 220,
        w: W,
        h: 30,
        text: "toque num dígito para mudar",
        text_size: 16,
        color: COLOR_MUTED,
        align_h: align.CENTER_H,
      });

      this.add(widget.BUTTON, {
        x: 40,
        y: 280,
        w: W - 80,
        h: 64,
        text: this.state.loading ? "Conectando..." : "Conectar",
        text_size: 26,
        radius: 32,
        normal_color: COLOR_ACCENT,
        press_color: 0x2fae9e,
        color: 0x00332d,
        click_func: () => this.pair(),
      });
    },

    pair() {
      if (this.state.loading) return;
      this.state.loading = true;
      this.renderPairing();
      const code = this.state.code.join("");
      this.httpRequest({
        method: "POST",
        url: `${API_URL}/pair`,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
        .then((res) => {
          const body = typeof res.body === "string" ? JSON.parse(res.body) : res.body;
          this.state.loading = false;
          if (body && body.token) {
            localStorage.setItem(TOKEN_KEY, body.token);
            this.state.token = body.token;
            this.loadToday();
          } else {
            this.showMessage("Código inválido");
            this.renderPairing();
          }
        })
        .catch(() => {
          this.state.loading = false;
          this.showMessage("Sem conexão");
          this.renderPairing();
        });
    },

    // ---------- dia ----------
    loadToday() {
      this.clear();
      this.add(widget.TEXT, {
        x: 0,
        y: Math.round(H / 2) - 20,
        w: W,
        h: 40,
        text: "Carregando...",
        text_size: 22,
        color: COLOR_MUTED,
        align_h: align.CENTER_H,
      });
      this.httpRequest({
        method: "GET",
        url: `${API_URL}/today?date=${todayKey()}`,
        headers: { Authorization: `Bearer ${this.state.token}` },
      })
        .then((res) => {
          const body = typeof res.body === "string" ? JSON.parse(res.body) : res.body;
          if (res.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            this.state.token = null;
            this.renderPairing();
            return;
          }
          this.state.data = body;
          this.renderToday();
        })
        .catch(() => this.showMessage("Sem conexão"));
    },

    renderToday() {
      this.clear();
      const data = this.state.data;
      if (!data || !data.habits) {
        this.showMessage("Erro ao carregar");
        return;
      }

      this.add(widget.TEXT, {
        x: 0,
        y: 24,
        w: W,
        h: 36,
        text: "Hoje",
        text_size: 28,
        color: COLOR_TEXT,
        align_h: align.CENTER_H,
      });
      this.add(widget.TEXT, {
        x: 0,
        y: 62,
        w: W,
        h: 30,
        text: `${data.done} de ${data.total} concluídos`,
        text_size: 20,
        color: data.done === data.total && data.total > 0 ? COLOR_ACCENT : COLOR_MUTED,
        align_h: align.CENTER_H,
      });

      let y = 108;
      const rowH = 76;
      for (const habit of data.habits) {
        this.renderHabitRow(habit, y, rowH);
        y += rowH + 10;
      }

      this.add(widget.BUTTON, {
        x: 60,
        y: y + 8,
        w: W - 120,
        h: 56,
        text: "Atualizar",
        text_size: 22,
        radius: 28,
        normal_color: COLOR_CARD,
        press_color: 0x2a3a40,
        color: COLOR_MUTED,
        click_func: () => this.loadToday(),
      });
    },

    renderHabitRow(habit, y, rowH) {
      const mark = habit.quit ? (habit.hasEntry ? "✕" : "✓") : habit.done ? "✓" : "○";
      const markColor = habit.quit
        ? habit.hasEntry
          ? COLOR_DANGER
          : COLOR_ACCENT
        : habit.done
          ? habit.color
          : COLOR_MUTED;

      this.add(widget.FILL_RECT, {
        x: 16,
        y,
        w: W - 32,
        h: rowH,
        radius: 18,
        color: COLOR_CARD,
      });
      this.add(widget.FILL_RECT, {
        x: 16,
        y,
        w: 6,
        h: rowH,
        radius: 3,
        color: habit.color,
      });
      this.add(widget.TEXT, {
        x: 34,
        y: y + 10,
        w: W - 130,
        h: 30,
        text: habit.name,
        text_size: 22,
        color: COLOR_TEXT,
        align_h: align.LEFT,
      });
      this.add(widget.TEXT, {
        x: 34,
        y: y + 42,
        w: W - 130,
        h: 24,
        text: habit.meta,
        text_size: 17,
        color: COLOR_MUTED,
        align_h: align.LEFT,
      });
      this.add(widget.BUTTON, {
        x: W - 92,
        y: y + 10,
        w: 62,
        h: rowH - 20,
        text: mark,
        text_size: 28,
        radius: 16,
        normal_color: 0x11181c,
        press_color: 0x2a3a40,
        color: markColor,
        click_func: () => this.toggle(habit),
      });
    },

    toggle(habit) {
      this.httpRequest({
        method: "POST",
        url: `${API_URL}/toggle`,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.state.token}`,
        },
        body: JSON.stringify({
          habit_id: habit.id,
          date: todayKey(),
          done: !habit.hasEntry,
        }),
      })
        .then(() => this.loadToday())
        .catch(() => this.showMessage("Sem conexão"));
    },

    showMessage(text) {
      this.clear();
      this.add(widget.TEXT, {
        x: 20,
        y: Math.round(H / 2) - 40,
        w: W - 40,
        h: 40,
        text,
        text_size: 22,
        color: COLOR_TEXT,
        align_h: align.CENTER_H,
      });
      this.add(widget.BUTTON, {
        x: 60,
        y: Math.round(H / 2) + 10,
        w: W - 120,
        h: 56,
        text: "Tentar de novo",
        text_size: 22,
        radius: 28,
        normal_color: COLOR_CARD,
        press_color: 0x2a3a40,
        color: COLOR_TEXT,
        click_func: () => (this.state.token ? this.loadToday() : this.renderPairing()),
      });
    },

    onDestroy() {},
  }),
);
