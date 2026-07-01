'use client';

import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { MpPhoto } from '@/components/mp-photo';
import { generateHemicycle } from '@/lib/hemicycle';
import {
  governmentSeats,
  majorityThreshold,
  orderBySpectrum,
  type ParliamentTerm,
} from '@/lib/parliament-data';
import { canonicalParty, partyColor } from '@/lib/party';
import { cn } from '@/lib/utils';
import type { MP } from '@/types/records';

interface ParliamentChartProps {
  terms: ParliamentTerm[];
  mps: MP[];
}

export function ParliamentChart({ terms, mps }: ParliamentChartProps) {
  // Default to the most recent term.
  const [index, setIndex] = useState(terms.length - 1);
  const [hoverParty, setHoverParty] = useState<string | null>(null);
  const [pinnedParty, setPinnedParty] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);

  const term = terms[index];
  const threshold = majorityThreshold(term.totalSeats);
  const govSeats = governmentSeats(term);
  const hasMajority = govSeats >= threshold;
  const highlightParty = hoverParty ?? pinnedParty;

  // Group tracked MPs by canonical party name (reconciling dataset variants).
  const mpsByParty = useMemo(() => {
    const map = new Map<string, MP[]>();
    for (const mp of mps) {
      if (!mp.party) continue;
      const key = canonicalParty(mp.party);
      const list = map.get(key) ?? [];
      list.push(mp);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [mps]);

  const mpsForParty = useMemo(
    () =>
      (party: string): MP[] =>
        mpsByParty.get(canonicalParty(party)) ?? [],
    [mpsByParty],
  );

  // Map each seat (ordered left→right) to a party and, where known, a real MP.
  const { seats, maxRadius, seatRadius, seatParties, seatMps } = useMemo(() => {
    const layout = generateHemicycle(term.totalSeats);
    const ordered = orderBySpectrum(term.parties);
    const parties: string[] = [];
    const holders: (MP | null)[] = [];
    for (const p of ordered) {
      const pool = mpsForParty(p.party);
      for (let i = 0; i < p.seats; i++) {
        parties.push(p.party);
        holders.push(pool[i] ?? null);
      }
    }
    return {
      seats: layout.seats,
      maxRadius: layout.maxRadius,
      seatRadius: layout.seatRadius,
      seatParties: parties,
      seatMps: holders,
    };
  }, [term, mpsForParty]);

  const pad = seatRadius + 0.15;
  const viewBox = `${-maxRadius - pad} ${-pad} ${2 * (maxRadius + pad)} ${maxRadius + 2 * pad}`;

  const selectedMp = selectedSeat !== null ? seatMps[selectedSeat] : null;
  const selectedSeatParty = selectedSeat !== null ? seatParties[selectedSeat] : null;

  function handleSeatClick(i: number) {
    setSelectedSeat((prev) => (prev === i ? null : i));
    setPinnedParty(seatParties[i] ?? null);
  }

  function handlePartyClick(party: string) {
    setPinnedParty((prev) => (prev === party ? null : party));
    setSelectedSeat(null);
  }

  return (
    <div className="flex flex-col gap-8">
      <YearScrubber
        terms={terms}
        index={index}
        onChange={(i) => {
          setIndex(i);
          setSelectedSeat(null);
        }}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Hemicycle */}
        <div className="relative">
          <svg
            viewBox={viewBox}
            className="h-auto w-full overflow-visible"
            role="img"
            aria-label={`Seating chart for the ${term.parliament}th Parliament, elected ${term.year}`}
          >
            {seats.map((seat, i) => {
              const party = seatParties[i] ?? 'Unaligned';
              const mp = seatMps[i];
              const dimmed = highlightParty !== null && highlightParty !== party;
              const isSelected = selectedSeat === i;
              return (
                <motion.circle
                  key={`${term.year}-${seat.row}-${seat.x.toFixed(3)}-${seat.angle.toFixed(3)}`}
                  cx={seat.x}
                  cy={maxRadius - seat.y}
                  r={seatRadius}
                  fill={partyColor(party)}
                  stroke={isSelected ? '#ffffff' : 'rgba(255,255,255,0.14)'}
                  strokeWidth={isSelected ? 0.12 : 0.03}
                  className="cursor-pointer"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: dimmed ? 0.15 : 1,
                    scale: isSelected ? 1.35 : 1,
                  }}
                  transition={{
                    duration: 0.35,
                    delay: Math.min(i * 0.0015, 0.4),
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{ transition: 'fill 0.4s ease' }}
                  onMouseEnter={() => setHoverParty(party)}
                  onMouseLeave={() => setHoverParty(null)}
                  onClick={() => handleSeatClick(i)}
                >
                  <title>{mp ? `${mp.name} — ${party}` : party}</title>
                </motion.circle>
              );
            })}
          </svg>

          {/* Centre readout sitting in the mouth of the arch */}
          <div className="pointer-events-none absolute inset-x-0 bottom-1 flex flex-col items-center">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={term.totalSeats}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="text-5xl font-semibold tabular-nums"
              >
                {term.totalSeats}
              </motion.span>
            </AnimatePresence>
            <span className="text-muted-foreground text-xs tracking-widest uppercase">seats</span>
          </div>
        </div>

        {/* Legend / breakdown */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Prime Minister" value={term.primeMinister} accent={term.pmParty} />
            <MiniStat
              label="Government"
              value={`${govSeats} seats`}
              hint={hasMajority ? 'Majority' : `${threshold - govSeats} short`}
              tone={hasMajority ? 'ok' : 'warn'}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            {orderBySeats(term).map((p) => {
              const pct = (p.seats / term.totalSeats) * 100;
              const inGov = term.government.includes(p.party);
              const active = highlightParty === p.party;
              const pinned = pinnedParty === p.party;
              return (
                <button
                  type="button"
                  key={p.party}
                  onMouseEnter={() => setHoverParty(p.party)}
                  onMouseLeave={() => setHoverParty(null)}
                  onClick={() => handlePartyClick(p.party)}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors',
                    pinned ? 'bg-accent/70' : active ? 'bg-accent/50' : 'hover:bg-accent/40',
                  )}
                >
                  <span
                    className="size-3 shrink-0 rounded-full ring-2 ring-white/10"
                    style={{ backgroundColor: partyColor(p.party) }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {p.party}
                        {inGov ? (
                          <span className="text-muted-foreground ml-1.5 align-middle text-[10px] tracking-wide uppercase">
                            · gov
                          </span>
                        ) : null}
                      </span>
                      <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
                        {p.seats}
                      </span>
                    </div>
                    <div className="bg-border/50 mt-1 h-1.5 overflow-hidden rounded-full">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: partyColor(p.party) }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <SeatDetail
            mp={selectedMp}
            seatParty={selectedSeatParty}
            pinnedParty={pinnedParty}
            rosterMps={pinnedParty ? mpsForParty(pinnedParty) : []}
            note={term.note}
            onClose={() => {
              setSelectedSeat(null);
              setPinnedParty(null);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function orderBySeats(term: ParliamentTerm) {
  return [...term.parties].sort((a, b) => b.seats - a.seats);
}

function SeatDetail({
  mp,
  seatParty,
  pinnedParty,
  rosterMps,
  note,
  onClose,
}: {
  mp: MP | null;
  seatParty: string | null;
  pinnedParty: string | null;
  rosterMps: MP[];
  note: string;
  onClose: () => void;
}) {
  // A specific seat is selected → show its holder (or a vacant seat).
  if (seatParty) {
    return (
      <div className="border-border/50 flex flex-col gap-3 border-t pt-4">
        {mp ? (
          <div className="flex items-center gap-3">
            <MpPhoto mp={mp} size={56} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {mp.role ? (
                  <span className="text-muted-foreground font-normal">{mp.role} </span>
                ) : null}
                {mp.name}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {seatParty}
                {mp.electorate ? ` · ${mp.electorate}` : ''}
              </p>
              <Link
                href={`/politicians/${mp.mpId}`}
                className="text-primary text-xs underline underline-offset-4"
              >
                View profile →
              </Link>
            </div>
            <DetailClose onClose={onClose} />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span
              className="grid size-14 shrink-0 place-items-center rounded-xl text-xs font-medium"
              style={{
                backgroundColor: `${partyColor(seatParty)}22`,
                color: partyColor(seatParty),
              }}
            >
              seat
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{seatParty}</p>
              <p className="text-muted-foreground text-xs">
                No individual MP on record in the tracked dataset for this seat.
              </p>
            </div>
            <DetailClose onClose={onClose} />
          </div>
        )}
      </div>
    );
  }

  // A party is pinned → show its tracked members as a roster.
  if (pinnedParty) {
    return (
      <div className="border-border/50 flex flex-col gap-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">
            {pinnedParty}
            <span className="text-muted-foreground ml-2 text-xs font-normal">
              {rosterMps.length} tracked {rosterMps.length === 1 ? 'MP' : 'MPs'}
            </span>
          </p>
          <DetailClose onClose={onClose} />
        </div>
        {rosterMps.length ? (
          <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {rosterMps.map((mp) => (
              <Link
                key={mp.mpId}
                href={`/politicians/${mp.mpId}`}
                className="hover:bg-accent/50 flex items-center gap-2 rounded-lg p-1.5 transition-colors"
              >
                <MpPhoto mp={mp} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{mp.name}</p>
                  <p className="text-muted-foreground truncate text-[10px]">
                    {mp.electorate ?? '—'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            No members for this party in the tracked dataset.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="border-border/50 flex flex-col gap-1.5 border-t pt-4">
      <p className="text-muted-foreground text-xs">{note}</p>
      <p className="text-muted-foreground/70 text-[11px]">
        Tip: click a seat to see who holds it, or a party to browse its members. Seat holders are
        drawn from the tracked MP dataset (voted.nz) and are indicative rather than term-specific.
      </p>
    </div>
  );
}

function DetailClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Clear selection"
      className="text-muted-foreground hover:text-foreground shrink-0 text-xs"
    >
      ✕
    </button>
  );
}

function MiniStat({
  label,
  value,
  hint,
  accent,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
  tone?: 'ok' | 'warn';
}) {
  return (
    <div className="border-border/60 bg-card/50 flex flex-col gap-0.5 rounded-lg border p-3">
      <span className="text-muted-foreground text-[10px] tracking-widest uppercase">{label}</span>
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        {accent ? (
          <span className="size-2 rounded-full" style={{ backgroundColor: partyColor(accent) }} />
        ) : null}
        <span className="truncate">{value}</span>
      </span>
      {hint ? (
        <span
          className={cn(
            'text-[11px] font-medium',
            tone === 'ok'
              ? 'text-emerald-400'
              : tone === 'warn'
                ? 'text-amber-400'
                : 'text-muted-foreground',
          )}
        >
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function YearScrubber({
  terms,
  index,
  onChange,
}: {
  terms: ParliamentTerm[];
  index: number;
  onChange: (i: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <input
        type="range"
        min={0}
        max={terms.length - 1}
        step={1}
        value={index}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Select election year"
        className="accent-primary bg-border h-1.5 w-full cursor-pointer appearance-none rounded-full"
      />
      <div className="flex flex-wrap gap-1.5">
        {terms.map((t, i) => {
          const active = i === index;
          return (
            <button
              type="button"
              key={t.year}
              onClick={() => onChange(i)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs tabular-nums transition-colors',
                active
                  ? 'bg-primary text-primary-foreground border-transparent'
                  : 'border-border/60 text-muted-foreground hover:text-foreground',
              )}
            >
              {t.year}
            </button>
          );
        })}
      </div>
    </div>
  );
}
