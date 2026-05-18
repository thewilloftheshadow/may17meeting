import { parseSrt } from "@remotion/captions";
import type { Caption, TikTokPage } from "@remotion/captions";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
} from "remotion";

const CAPTION_OFFSET_MS = 0;
const MAX_CAPTION_WORDS = 32;
const MAX_CAPTION_CHARS = 210;
const HIGHLIGHT = "#7dd3fc";
const GOLD = "#f9d77e";

const cleanCaptionText = (text: string) =>
  text
    .replace(/^\s*Shadow:\s*/i, "")
    .replace(/ClawedBot|ClaudeBot|Clawed Bot|Claude Bot/gi, "ClawdBot")
    .replace(/Warlay|Warley|Warely/gi, "Warelay")
    .replace(/Claudeous|Claudis|Clawdis/gi, "Clawdis")
    .replace(/OpenClaw|Open Claw/gi, "OpenClaw")
    .replace(/Moldbot|Maltbot|Molt Bot/gi, "MoltBot")
    .replace(/\bclaws\b/gi, "Claws")
    .replace(/\bclawed\b/gi, "Claw")
    .replace(/Golden Pass/gi, "Golden Path")
    .replace(/\bNIX\b|\bNYX\b/gi, "Nix")
    .replace(/\s+/g, " ")
    .trim();

const wordCount = (value: string) => value.match(/\S+/g)?.length ?? 0;

const canFitCaption = (value: string) =>
  wordCount(value) <= MAX_CAPTION_WORDS && value.length <= MAX_CAPTION_CHARS;

const splitLongCaptionUnit = (unit: string) => {
  if (canFitCaption(unit)) {
    return [unit];
  }

  const clauses =
    unit.match(/[^,;:]+[,;:]?|[^,;:]+$/g)?.map((part) => part.trim()) ?? [];
  const chunks: string[] = [];
  let current = "";

  for (const clause of clauses) {
    const candidate = current ? `${current} ${clause}` : clause;

    if (canFitCaption(candidate)) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    if (canFitCaption(clause)) {
      current = clause;
      continue;
    }

    const words = clause.match(/\S+/g) ?? [];
    for (let index = 0; index < words.length; index += MAX_CAPTION_WORDS) {
      chunks.push(words.slice(index, index + MAX_CAPTION_WORDS).join(" "));
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
};

const splitCaptionIntoPages = (caption: Caption): TikTokPage[] => {
  const text = cleanCaptionText(caption.text);
  const sentenceUnits =
    text.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g)?.map((part) => part.trim()) ??
    [];
  const units = sentenceUnits.reduce<string[]>(
    (all, unit) => all.concat(splitLongCaptionUnit(unit)),
    [],
  );
  const chunks: string[] = [];
  let current = "";

  for (const unit of units) {
    const candidate = current ? `${current} ${unit}` : unit;

    if (canFitCaption(candidate)) {
      current = candidate;
    } else {
      if (current) {
        chunks.push(current);
      }
      current = unit;
    }
  }

  if (current) {
    chunks.push(current);
  }

  const safeChunks = chunks.length > 0 ? chunks : [text];
  const duration = caption.endMs - caption.startMs;
  const totalWords = Math.max(
    safeChunks.reduce((total, chunk) => total + wordCount(chunk), 0),
    1,
  );
  let cursor = caption.startMs;

  return safeChunks.map((chunk, index) => {
    const chunkDuration =
      index === safeChunks.length - 1
        ? caption.endMs - cursor
        : duration * (wordCount(chunk) / totalWords);
    const startMs = cursor + CAPTION_OFFSET_MS;
    const endMs = startMs + chunkDuration;
    cursor += chunkDuration;

    return {
      text: chunk,
      startMs,
      durationMs: chunkDuration,
      tokens: [
        {
          text: chunk,
          fromMs: startMs,
          toMs: endMs,
        },
      ],
    };
  });
};

const useCaptionPages = () => {
  const [captions, setCaptions] = useState<Caption[] | null>(null);
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender("Loading Craig captions"));

  const load = useCallback(async () => {
    try {
      const response = await fetch(staticFile("craig-captions.srt"));
      const text = await response.text();
      const { captions: parsed } = parseSrt({ input: text });
      setCaptions(parsed);
      continueRender(handle);
    } catch (error) {
      cancelRender(error);
    }
  }, [cancelRender, continueRender, handle]);

  useEffect(() => {
    load();
  }, [load]);

  return useMemo(() => {
    if (!captions) {
      return null;
    }

    return captions.reduce<TikTokPage[]>(
      (all, caption) => all.concat(splitCaptionIntoPages(caption)),
      [],
    );
  }, [captions]);
};

const Background = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 240], [0, 1], {
    extrapolateRight: "extend",
    easing: Easing.inOut(Easing.ease),
  });

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 22% 18%, rgba(125, 211, 252, 0.24), transparent 34%), radial-gradient(circle at 82% 34%, rgba(249, 215, 126, 0.17), transparent 32%), linear-gradient(135deg, #07111f 0%, #091827 42%, #120d22 100%)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -180,
          background:
            "linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.05) 45%, transparent 58%)",
          transform: `translateX(${Math.sin(drift * Math.PI * 2) * 90}px) rotate(-8deg)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 760,
          height: 760,
          right: -180,
          bottom: -260,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(125,211,252,0.22), rgba(125,211,252,0.04) 45%, transparent 70%)",
          filter: "blur(4px)",
          transform: `scale(${1 + Math.sin(frame / 90) * 0.04})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 18%, black 78%, transparent 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

const Avatar = ({ speakingLevel }: { speakingLevel: number }) => {
  const frame = useCurrentFrame();
  const isSpeaking = speakingLevel > 0.02;
  const glowWave = interpolate(Math.sin(frame / 5), [-1, 1], [0.48, 0.82]);
  const glow = 0.22 + (glowWave - 0.22) * speakingLevel;
  const accentRotation = speakingLevel > 0.02 ? frame * 4 * speakingLevel : 0;

  return (
    <div
      style={{
        position: "absolute",
        right: 132,
        bottom: 126,
        width: 360,
        height: 360,
        transformOrigin: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -36,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(125,211,252,${glow}), rgba(249,215,126,0.18) 42%, transparent 69%)`,
          filter: "blur(22px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 32,
          borderRadius: "50%",
          overflow: "hidden",
          background: "#0d1725",
          boxShadow:
            "0 30px 90px rgba(0,0,0,0.48), inset 0 0 0 4px rgba(255,255,255,0.13)",
        }}
      >
        <Img
          src={staticFile("avatar.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: `brightness(${0.92 + 0.33 * speakingLevel}) saturate(${0.88 + 0.3 * speakingLevel}) contrast(${1 + 0.05 * speakingLevel})`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.08 + 0.28 * speakingLevel,
            background:
              "radial-gradient(circle at 36% 24%, rgba(255,255,255,0.86), transparent 28%), linear-gradient(135deg, rgba(125,211,252,0.55), transparent 52%)",
            mixBlendMode: "screen",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 18,
          borderRadius: "50%",
          border: `${7 + 6 * speakingLevel}px solid rgba(125,211,252,${0.36 + 0.64 * speakingLevel})`,
          boxShadow: `0 0 ${18 + 4 * speakingLevel}px rgba(125,211,252,${0.28 + 0.67 * speakingLevel}), 0 0 ${62 * speakingLevel}px rgba(125,211,252,${0.42 * speakingLevel}), inset 0 0 ${12 + 6 * speakingLevel}px rgba(125,211,252,${0.12 + 0.24 * speakingLevel})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 12 - 8 * speakingLevel,
          borderRadius: "50%",
          background: `conic-gradient(from ${accentRotation}deg, transparent 0deg, rgba(125,211,252,0.2) 42deg, ${GOLD} 70deg, transparent 112deg, transparent 210deg, rgba(125,211,252,0.55) 250deg, transparent 306deg)`,
          opacity: 0.24 + 0.58 * speakingLevel,
          maskImage: "radial-gradient(circle, transparent 58%, black 60%, black 70%, transparent 72%)",
          filter: "blur(0.3px)",
        }}
      />
      {Array.from({ length: 22 }, (_, index) => {
        const angle = (index / 22) * Math.PI * 2;
        const amp = 4 + speakingLevel * (8 + Math.sin(frame / 3 + index * 1.7) * 9);
        const radius = 180 + amp;

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: 180 + Math.cos(angle) * radius - 3,
              top: 180 + Math.sin(angle) * radius - 3,
              width: 3 + 3 * speakingLevel,
              height: 3 + 3 * speakingLevel,
              borderRadius: "50%",
              background: index % 5 === 0 ? GOLD : HIGHLIGHT,
              opacity: 0.18 + 0.54 * speakingLevel,
              boxShadow: `0 0 ${5 + 9 * speakingLevel}px ${index % 5 === 0 ? GOLD : HIGHLIGHT}`,
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 86,
          right: 86,
          bottom: -38,
          height: 46,
          borderRadius: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          color: "white",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          fontWeight: 800,
          fontSize: 19,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          background: "rgba(6, 14, 26, 0.72)",
          border: "1px solid rgba(255,255,255,0.16)",
          boxShadow: "0 18px 45px rgba(0,0,0,0.34)",
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: isSpeaking ? GOLD : "rgba(255,255,255,0.38)",
            boxShadow: isSpeaking ? `0 0 18px ${GOLD}` : "none",
          }}
        />
        Shadow
      </div>
    </div>
  );
};

const CaptionPage = ({
  page,
  nowMs,
}: {
  page: TikTokPage;
  nowMs: number;
}) => {
  const { fps } = useVideoConfig();
  const localFrame = ((nowMs - page.startMs) / 1000) * fps;
  const enter = interpolate(localFrame, [0, 7], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(localFrame, [0, 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "flex-start",
        paddingLeft: 126,
        paddingRight: 610,
        paddingTop: 46,
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          transform: `translateY(${enter}px)`,
          opacity,
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          fontSize: 52,
          lineHeight: 1.08,
          fontWeight: 900,
          letterSpacing: -1.8,
          color: "white",
          textWrap: "balance",
          textShadow:
            "0 5px 0 rgba(0,0,0,0.34), 0 20px 60px rgba(0,0,0,0.54)",
        }}
      >
        <span
          style={{
            color: "rgba(255,255,255,0.96)",
            WebkitTextStroke: "1px rgba(255,255,255,0.09)",
          }}
        >
          {page.text}
        </span>
      </div>
    </AbsoluteFill>
  );
};

const Captions = ({
  page,
  nowMs,
}: {
  page: TikTokPage | null;
  nowMs: number;
}) => {
  if (!page) {
    return null;
  }

  return <CaptionPage page={page} nowMs={nowMs} />;
};

const Header = () => (
  <div
    style={{
      position: "absolute",
      left: 126,
      top: 82,
      display: "flex",
      alignItems: "center",
      gap: 16,
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      color: "rgba(255,255,255,0.86)",
      fontSize: 22,
      fontWeight: 800,
      letterSpacing: 2.3,
      textTransform: "uppercase",
    }}
  >
    <span
      style={{
        width: 48,
        height: 2,
        background: `linear-gradient(90deg, ${HIGHLIGHT}, ${GOLD})`,
        boxShadow: "0 0 18px rgba(125,211,252,0.8)",
      }}
    />
    Mandatory Monthly (Maybe) Mod Meeting - May 17
  </div>
);

const Progress = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = Math.max(0, Math.min(1, frame / durationInFrames));

  return (
    <div
      style={{
        position: "absolute",
        left: 126,
        right: 126,
        bottom: 58,
        height: 6,
        borderRadius: 99,
        background: "rgba(255,255,255,0.1)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${progress * 100}%`,
          height: "100%",
          borderRadius: 99,
          background: `linear-gradient(90deg, ${HIGHLIGHT}, ${GOLD})`,
          boxShadow: "0 0 28px rgba(125,211,252,0.7)",
        }}
      />
    </div>
  );
};

export const MyComposition = () => {
  const pages = useCaptionPages();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowMs = (frame / fps) * 1000;
  const activePage = pages?.find(
    (page) => nowMs >= page.startMs - 260 && nowMs < page.startMs + page.durationMs + 360,
  );
  const fadeMs = activePage ? Math.min(260, activePage.durationMs / 3) : 0;
  const speakingLevel = activePage
    ? interpolate(
        nowMs,
        [
          activePage.startMs - fadeMs,
          activePage.startMs + fadeMs,
          activePage.startMs + activePage.durationMs - fadeMs,
          activePage.startMs + activePage.durationMs + fadeMs,
        ],
        [0, 1, 1, 0],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        },
      )
    : 0;

  if (!pages) {
    return null;
  }

  return (
    <AbsoluteFill>
      <Background />
      <Audio src={staticFile("craig-audio.m4a")} />
      <Header />
      <Captions page={activePage ?? null} nowMs={nowMs} />
      <Avatar speakingLevel={speakingLevel} />
      <Progress />
    </AbsoluteFill>
  );
};
