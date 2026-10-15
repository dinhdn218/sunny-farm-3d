'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { useCasinoStore } from '@/store/useCasinoStore';
import {
  CASINO_TABLES,
  FORFEIT_UNITS,
  SEATS,
  TURN_MS,
  TableId,
  TableState,
  minGoldFor,
  seatOf,
  seatSpot,
} from '@/lib/casino';
import { leaveTable, playMove, sitAt } from '@/lib/casinoNet';
import {
  Card,
  COLD_PENALTY,
  RANK_LABELS,
  SUIT_LABELS,
  analyze,
  botMove,
  canBeat,
  cardLabel,
  comboName,
  isRed,
  rankOf,
  suitOf,
} from '@/lib/tienlen';
import { soundFX } from '@/lib/audio';

type CardSize = 'sm' | 'md' | 'lg' | 'hand';

const CARD_SIZES: Record<CardSize, string> = {
  sm: 'h-[46px] w-8 text-[11px]',
  md: 'h-[60px] w-[42px] text-[13px]',
  lg: 'h-[76px] w-[54px] text-base',
  // The hand fits a phone's width: smaller cards there, full size from sm up
  hand: 'h-[60px] w-[42px] text-[13px] sm:h-[76px] sm:w-[54px] sm:text-base',
};

const PLACE_BADGES = ['🥇 Về nhất', '🥈 Về nhì', '🥉 Về ba', '💀 Về bét'];

function CardFace({
  card,
  size,
  selected = false,
  onClick,
}: {
  card: Card;
  size: CardSize;
  selected?: boolean;
  onClick?: () => void;
}) {
  const suit = SUIT_LABELS[suitOf(card)];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={cardLabel(card)}
      aria-pressed={onClick ? selected : undefined}
      className={`relative shrink-0 select-none rounded-lg border bg-gradient-to-b from-white to-slate-50 font-black leading-none shadow-[0_2px_0_rgba(15,23,42,0.35)] transition-transform duration-150 ${
        CARD_SIZES[size]
      } ${isRed(card) ? 'text-red-600' : 'text-slate-900'} ${
        selected ? '-translate-y-3 border-amber-400 ring-2 ring-amber-300' : 'border-slate-300'
      } ${onClick ? (selected ? 'cursor-pointer' : 'cursor-pointer hover:-translate-y-1') : 'cursor-default'}`}
    >
      <span className="absolute left-[0.3em] top-[0.3em] flex flex-col items-center gap-[0.1em]">
        <span>{RANK_LABELS[rankOf(card)]}</span>
        <span className="text-[0.85em]">{suit}</span>
      </span>
      <span className="absolute inset-0 flex items-end justify-end p-[0.25em] text-[1.9em] leading-none">{suit}</span>
    </button>
  );
}

function CardBack({ size = 'sm' }: { size?: CardSize }) {
  return (
    <span
      className={`block shrink-0 rounded-lg border-2 border-amber-100 bg-[repeating-linear-gradient(45deg,#b91c1c_0_5px,#7f1d1d_5px_10px)] shadow-[0_2px_0_rgba(0,0,0,0.35)] ${CARD_SIZES[size]}`}
    />
  );
}

const initialOf = (name: string) => name.replace(/^🤖\s*/, '').trim().charAt(0).toUpperCase() || '?';

// An opponent around the table: who they are, how many cards they hold, and how their turn is going
function SeatPanel({ table, seat, now, mine }: { table: TableState; seat: number; now: number; mine: boolean }) {
  const info = table.seats[seat];
  const game = table.game;
  const playing = table.phase === 'playing' && !!game;
  const isTurn = playing && game.turn === seat;
  const cards = game ? game.hands[seat].length : 0;
  const place = table.result ? table.result.ranking.indexOf(seat) : -1;
  // A ring that empties as their time runs out
  const share = isTurn && info?.kind === 'human' ? Math.max(0, Math.min(1, (table.deadline - now) / TURN_MS)) : 1;
  const status = !info
    ? 'Ghế trống'
    : table.phase === 'result' && place >= 0
    ? PLACE_BADGES[place === SEATS - 1 ? 3 : place]
    : !playing
    ? info.kind === 'bot'
      ? 'Máy chơi thay'
      : 'Sẵn sàng'
    : game.finished.includes(seat)
    ? `Hết bài #${game.finished.indexOf(seat) + 1}`
    : game.frozen.includes(seat)
    ? '🥶 Cóng'
    : game.passed[seat]
    ? 'Bỏ lượt'
    : isTurn
    ? info.kind === 'bot'
      ? 'Đang nghĩ…'
      : mine
      ? 'Lượt của bạn'
      : 'Đang đánh…'
    : '';

  return (
    <div className={`flex items-center gap-2 rounded-2xl px-2 py-1.5 ${isTurn ? 'bg-black/35' : 'bg-black/20'} ${info ? '' : 'opacity-60'}`}>
      <div
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-[3px]"
        style={{
          background: isTurn
            ? `conic-gradient(#facc15 ${share * 360}deg, rgba(255,255,255,0.15) 0deg)`
            : 'rgba(255,255,255,0.15)',
        }}
      >
        <span
          className={`flex h-full w-full items-center justify-center rounded-full text-base font-black ${
            info?.kind === 'bot' ? 'bg-slate-700 text-white' : 'bg-amber-200 text-amber-950'
          }`}
        >
          {info ? (info.kind === 'bot' ? '🤖' : initialOf(info.name)) : '·'}
        </span>
      </div>
      <div className="min-w-0">
        <div className="max-w-[118px] truncate text-xs font-black text-white sm:max-w-[150px]">
          {info ? info.name.replace(/^🤖\s*/, '') : '—'}
          {mine && <span className="ml-1 text-amber-300">(Bạn)</span>}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-100">
          {playing && !mine && cards > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-black/30 px-1.5 py-0.5 tabular-nums">
              <span aria-hidden className="inline-block h-3 w-2 rounded-[2px] bg-red-700 ring-1 ring-amber-100" />
              {cards}
              {cards <= 2 && <span className="text-amber-300">• Sắp hết!</span>}
            </span>
          )}
          {status && <span className={isTurn ? 'text-amber-300' : ''}>{status}</span>}
        </div>
      </div>
    </div>
  );
}

function RulesPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="parchment-panel absolute inset-x-3 top-14 z-20 max-h-[70%] overflow-y-auto rounded-2xl p-4 text-xs font-bold leading-relaxed sm:inset-x-auto sm:right-4 sm:w-[380px]">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-black text-amber-950">📖 Luật Tiến Lên Miền Nam</span>
        <button onClick={onClose} className="rounded-lg bg-amber-700 px-2 py-0.5 text-[11px] font-black text-white">
          Đóng
        </button>
      </div>
      <ul className="list-disc space-y-1 pl-4 text-amber-900">
        <li>4 người, mỗi người 13 lá. Lá nhỏ nhất là 3♠, lớn nhất là 2♥ (3 → A → 2; ♠ &lt; ♣ &lt; ♦ &lt; ♥).</li>
        <li>Ván đầu người có 3♠ đánh trước và phải đánh kèm 3♠; các ván sau người về nhất đánh trước.</li>
        <li>Bộ hợp lệ: rác, đôi, sám, tứ quý, sảnh (≥3 lá liền nhau, không có 2), đôi thông (≥3 đôi liền nhau).</li>
        <li>Chặn bằng bộ cùng loại, cùng số lá, lá cao nhất lớn hơn. Bỏ lượt thì nghỉ đến hết vòng.</li>
        <li>Chặt heo: 3 đôi thông chặt 1 heo; tứ quý chặt heo, đôi heo, 3 đôi thông; 4 đôi thông chặt tất cả. Bị chặt trả 1 cược mỗi heo đen, 2 cược mỗi heo đỏ.</li>
        <li>Tới trắng (thắng ngay khi chia): Sảnh Rồng, Tứ Quý Heo, 5 Đôi Thông, 6 Đôi — mỗi người trả 2 cược.</li>
        <li>Về nhất +2, nhì +1, ba −1, bét −2 cược. Chưa đánh lá nào khi có người về nhất là Cóng (phạt thêm {COLD_PENALTY} cược). Còn heo trên tay lúc thua là Thối heo.</li>
        <li>Rời bàn giữa ván bị phạt {FORFEIT_UNITS} cược, máy sẽ đánh nốt phần bài của bạn.</li>
      </ul>
    </div>
  );
}

function ResultPanel({ table, me }: { table: TableState; me: string }) {
  const result = table.result;
  if (!result) return null;
  return (
    <div className="card-in w-full max-w-sm rounded-2xl border-2 border-amber-300/70 bg-black/55 p-3 text-white shadow-xl">
      <div className="mb-2 text-center text-sm font-black text-amber-300">
        {result.instant ? `⚡ Tới trắng: ${result.instant}!` : '🏁 Kết thúc ván'}
      </div>
      <ol className="space-y-1.5">
        {result.ranking.map((seat, place) => {
          const info = table.seats[seat];
          const gold = result.gold[seat];
          return (
            <li
              key={seat}
              className={`rounded-xl px-2.5 py-1.5 ${info?.uid === me ? 'bg-amber-400/25 ring-1 ring-amber-300' : 'bg-white/10'}`}
            >
              <div className="flex items-center justify-between gap-2 text-xs font-black">
                <span className="truncate">
                  {PLACE_BADGES[place === SEATS - 1 ? 3 : place].split(' ')[0]} {info?.name ?? '—'}
                </span>
                <span className={`tabular-nums ${gold >= 0 ? 'text-lime-300' : 'text-red-300'}`}>
                  {gold >= 0 ? '+' : '−'}
                  {Math.abs(gold)}🪙
                </span>
              </div>
              <div className="truncate text-[10px] font-bold text-white/70">{result.notes[seat].join(' • ')}</div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// The middle of the felt: the play to beat, or what the table is waiting for
function CenterPile({ table, me, now }: { table: TableState; me: string; now: number }) {
  const game = table.game;
  const seconds = Math.max(0, Math.ceil((table.deadline - now) / 1000));

  if (table.phase === 'result') {
    return (
      <div className="flex flex-col items-center gap-2">
        <ResultPanel table={table} me={me} />
        <div className="text-[11px] font-black text-emerald-100">Ván mới sau {seconds}s…</div>
      </div>
    );
  }
  if (table.phase === 'waiting' || !game) {
    return (
      <div className="text-center text-white">
        <div className="text-4xl">🃏</div>
        <div className="mt-1 text-sm font-black">Chia bài sau {seconds}s…</div>
        <div className="text-[11px] font-bold text-emerald-100">Ghế trống sẽ có máy chơi thay</div>
      </div>
    );
  }
  const lead = game.lead;
  const leader = lead ? table.seats[lead.seat] : null;
  const turnInfo = table.seats[game.turn];
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      {lead ? (
        <>
          <div key={`${lead.seat}-${lead.combo.top}-${lead.combo.cards.length}`} className="card-in flex flex-wrap justify-center gap-1">
            {lead.combo.cards.map((c) => (
              <CardFace key={c} card={c} size="md" />
            ))}
          </div>
          <div className="text-[11px] font-black text-emerald-50">
            {leader?.uid === me ? 'Bạn' : leader?.name.replace(/^🤖\s*/, '')} • {comboName(lead.combo)}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-white/30 px-6 py-5 text-sm font-black text-white/80">
          Vòng mới
        </div>
      )}
      <div className="text-xs font-black text-amber-200">
        {turnInfo?.uid === me
          ? lead
            ? '👉 Lượt của bạn: chặn hoặc bỏ lượt'
            : '👉 Lượt của bạn: đánh bộ bất kỳ'
          : `Chờ ${turnInfo?.name.replace(/^🤖\s*/, '') ?? '…'}`}
      </div>
    </div>
  );
}

function TableView({ id, table }: { id: TableId; table: TableState | undefined }) {
  const me = useGameStore((s) => s.playerId);
  const gold = useGameStore((s) => s.gold);
  const setOpen = useCasinoStore((s) => s.setOpen);
  const config = CASINO_TABLES[id];
  const [now, setNow] = useState(() => Date.now());
  const [selected, setSelected] = useState<Card[]>([]);
  const [bySuit, setBySuit] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [rules, setRules] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const seat = table ? seatOf(table, me) : -1;
  const waitingNext = !!table && table.waiting.some((w) => w.uid === me);
  const game = table?.game ?? null;
  const playing = table?.phase === 'playing' && !!game;
  const hand = useMemo(() => {
    if (!game || seat < 0) return [];
    const cards = [...game.hands[seat]];
    return bySuit ? cards.sort((a, b) => suitOf(a) - suitOf(b) || a - b) : cards.sort((a, b) => a - b);
  }, [game, seat, bySuit]);
  const myTurn = !!game && playing && seat >= 0 && game.turn === seat;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  // Cards that left the hand can't stay selected
  useEffect(() => {
    setSelected((cur) => cur.filter((c) => hand.includes(c)));
  }, [hand]);

  // Sounds and a banner for what just happened at the table
  const lastKey = game?.last ? `${table?.gameId}-${game.last.seat}-${game.last.kind}-${game.hands.flat().length}` : '';
  const seen = useRef('');
  useEffect(() => {
    if (!lastKey || lastKey === seen.current || !game?.last) return;
    seen.current = lastKey;
    const { kind } = game.last;
    if (kind === 'play') soundFX.card();
    if (kind === 'chop') {
      soundFX.chop();
      setBanner('💥 CHẶT!');
    }
    if (kind === 'win') setBanner('⚡ TỚI TRẮNG!');
  }, [lastKey, game]);
  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 1400);
    return () => clearTimeout(timer);
  }, [banner]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 2600);
    return () => clearTimeout(timer);
  }, [message]);

  // Sit in your chair at the 3D table while you play
  useEffect(() => {
    if (seat < 0) return;
    const { playerPos } = useGameStore.getState();
    const spot = seatSpot(id, seat);
    playerPos.x = spot.x;
    playerPos.z = spot.z;
    playerPos.rotY = spot.rotY;
  }, [seat, id]);

  const combo = analyze(selected);
  const legal =
    !!combo &&
    !!game &&
    myTurn &&
    (game.mustInclude === null || combo.cards.includes(game.mustInclude)) &&
    (!game.lead || canBeat(combo, game.lead.combo));
  const selectionNote = !selected.length
    ? ''
    : !combo
    ? 'Bộ không hợp lệ'
    : game?.mustInclude !== null && game?.mustInclude !== undefined && !combo.cards.includes(game.mustInclude)
    ? `Phải đánh kèm ${cardLabel(game.mustInclude)}`
    : game?.lead && !canBeat(combo, game.lead.combo)
    ? `${comboName(combo)} không chặn được`
    : comboName(combo);

  const toggle = (card: Card) =>
    setSelected((cur) => (cur.includes(card) ? cur.filter((c) => c !== card) : [...cur, card]));
  const send = (kind: 'play' | 'pass') => {
    const error = playMove(id, kind === 'play' ? { kind, cards: selected } : { kind });
    if (error) {
      soundFX.error();
      setMessage(error);
    } else if (kind === 'play') {
      setSelected([]);
    }
  };
  const hint = () => {
    if (!myTurn || !game) return;
    const move = botMove(game, seat);
    if (move.kind === 'play') setSelected(move.cards);
    else setMessage('Gợi ý: nên bỏ lượt');
  };
  const sit = () => {
    const error = sitAt(id);
    if (error) {
      soundFX.error();
      setMessage(error);
    }
  };
  const close = () => {
    if (seat >= 0 && playing && !window.confirm(`Đang giữa ván! Rời bàn sẽ bị phạt ${config.stake * FORFEIT_UNITS}🪙. Vẫn rời?`)) {
      return;
    }
    leaveTable(id);
    setOpen(null);
  };

  // Enter plays the selected cards
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' && legal) send('play');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Seats around the felt, counter-clockwise from you: right, top, left
  const base = seat >= 0 ? seat : 0;
  const around = [1, 2, 3].map((k) => (base + k) % SEATS);
  const felt = config.felt;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-2 sm:p-4">
      <div className="wood-panel relative flex h-[min(94vh,780px)] w-full max-w-5xl flex-col rounded-[2rem] p-2 sm:rounded-[2.5rem] sm:p-3">
        <div
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.6rem] shadow-[inset_0_0_40px_rgba(0,0,0,0.55)] sm:rounded-[2rem]"
          style={{
            background: `radial-gradient(ellipse at 50% 42%, color-mix(in srgb, ${felt} 80%, white) 0%, ${felt} 55%, color-mix(in srgb, ${felt} 65%, black) 100%)`,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-3 pt-2.5 sm:px-4">
            <div className="rounded-xl bg-black/30 px-3 py-1 text-white">
              <div className="text-sm font-black leading-tight">🃏 {config.name} • Tiến Lên Miền Nam</div>
              <div className="text-[10px] font-bold text-emerald-100">
                Cược {config.stake}🪙 • Bạn có {gold}🪙
              </div>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setRules(!rules)}
                className="game-btn rounded-xl border-2 border-amber-900 bg-amber-500 px-2.5 py-1.5 text-xs font-black text-amber-950 hover:bg-amber-400"
              >
                📖 Luật
              </button>
              <button
                onClick={close}
                className="game-btn rounded-xl border-2 border-red-950 bg-red-600 px-2.5 py-1.5 text-xs font-black text-white hover:bg-red-500"
              >
                {seat >= 0 || waitingNext ? '🚪 Rời bàn' : '✕ Đóng'}
              </button>
            </div>
          </div>

          {rules && <RulesPanel onClose={() => setRules(false)} />}

          {!table ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-white">
              <div className="text-5xl">🪑</div>
              <div className="text-base font-black">Bàn đang trống</div>
              <div className="max-w-xs text-xs font-bold text-emerald-100">
                Ngồi xuống để mở bàn. Người chơi khác trong Casino có thể vào cùng, ghế trống sẽ có máy chơi thay.
              </div>
              <button
                onClick={sit}
                className="game-btn rounded-2xl border-2 border-amber-900 bg-amber-400 px-6 py-2.5 text-sm font-black text-amber-950 hover:bg-amber-300"
              >
                🪑 Ngồi vào bàn (cần {minGoldFor(config.stake)}🪙)
              </button>
            </div>
          ) : (
            <>
              {/* Opponents: top, then left and right */}
              <div className="flex justify-center px-3 pt-2">
                <SeatPanel table={table} seat={around[1]} now={now} mine={false} />
              </div>
              <div className="flex min-h-0 flex-1 items-center justify-between gap-2 px-2 sm:px-4">
                <div className="w-[34%] max-w-[200px] sm:w-auto">
                  <SeatPanel table={table} seat={around[2]} now={now} mine={false} />
                </div>
                <div className="flex min-w-0 flex-1 justify-center">
                  <CenterPile table={table} me={me} now={now} />
                </div>
                <div className="flex w-[34%] max-w-[200px] justify-end sm:w-auto">
                  <SeatPanel table={table} seat={around[0]} now={now} mine={false} />
                </div>
              </div>

              {/* You */}
              <div className="px-2 pb-2 sm:px-4 sm:pb-3">
                {seat >= 0 ? (
                  <>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <SeatPanel table={table} seat={seat} now={now} mine />
                      <div className="min-h-[1rem] text-right text-[11px] font-black text-amber-200">
                        {message ?? selectionNote}
                      </div>
                    </div>
                    {hand.length > 0 && (
                      <div className="flex justify-center overflow-x-auto pb-1 pt-4">
                        <div className="flex px-2 [&>*+*]:-ml-5">
                          {hand.map((c) => (
                            <CardFace
                              key={c}
                              card={c}
                              size="hand"
                              selected={selected.includes(c)}
                              onClick={playing ? () => toggle(c) : undefined}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {playing && (
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <div className="flex gap-1.5">
                          <button
                            onClick={hint}
                            disabled={!myTurn}
                            className="game-btn rounded-xl border-2 border-sky-950 bg-sky-700 px-2.5 py-2 text-xs font-black text-white hover:bg-sky-600 disabled:opacity-50"
                          >
                            💡 Gợi ý
                          </button>
                          <button
                            onClick={() => setBySuit(!bySuit)}
                            className="game-btn rounded-xl border-2 border-slate-950 bg-slate-700 px-2.5 py-2 text-xs font-black text-white hover:bg-slate-600"
                          >
                            ↕ {bySuit ? 'Xếp theo số' : 'Xếp theo chất'}
                          </button>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => send('pass')}
                            disabled={!myTurn || !game?.lead}
                            className="game-btn rounded-xl border-2 border-stone-950 bg-stone-600 px-3 py-2 text-xs font-black text-white hover:bg-stone-500 disabled:opacity-50"
                          >
                            Bỏ lượt
                          </button>
                          <button
                            onClick={() => send('play')}
                            disabled={!legal}
                            className="game-btn rounded-xl border-2 border-amber-900 bg-amber-400 px-5 py-2 text-sm font-black text-amber-950 hover:bg-amber-300 disabled:opacity-50"
                          >
                            ĐÁNH
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 py-2 text-center text-white">
                    {waitingNext ? (
                      <div className="text-sm font-black">⏳ Bạn sẽ vào chơi từ ván sau</div>
                    ) : (
                      <button
                        onClick={sit}
                        className="game-btn rounded-2xl border-2 border-amber-900 bg-amber-400 px-6 py-2.5 text-sm font-black text-amber-950 hover:bg-amber-300"
                      >
                        🪑 Ngồi vào bàn (cần {minGoldFor(config.stake)}🪙)
                      </button>
                    )}
                    {message && <div className="text-xs font-black text-amber-200">{message}</div>}
                  </div>
                )}
              </div>
            </>
          )}

          {banner && (
            <div className="card-in pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="rounded-3xl border-4 border-white bg-red-600 px-6 py-3 text-3xl font-black text-white shadow-2xl [text-shadow:0_3px_0_rgba(0,0,0,0.35)]">
                {banner}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// The card table window: open while sitting at (or watching) a casino table
export function TienLenTable() {
  const open = useCasinoStore((s) => s.open);
  const table = useCasinoStore((s) => (s.open ? s.tables[s.open] : undefined));
  if (!open) return null;
  return <TableView id={open} table={table} />;
}
