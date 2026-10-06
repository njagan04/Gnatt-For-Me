import { fmt, isoWeek, monday, workRange, addDays } from '../../lib/days';

// Geometry shared with Board's scroll engine.
export const C = 12; // strip index of the anchor week's Wednesday (strip = 5 weeks of workdays)
export const SEAM = 26; // px, weekend seam (matches --seam)
export const PAD = 18,
  ROW = 48,
  GAP = 30; // px: top padding, lane height, gap between category groups
export const stripOf = w => workRange(addDays(w, -14), addDays(w, 20)); // 25 workdays, anchor Mon at index 10

// The board: a fixed header strip (week row + day headers) over a body that scrolls vertically.
// Both tracks are slid sideways by Board (one transform each); this component only draws.
export default function Timeline({ refs, strip, today, vis, drawn, height, hover, arrive, noted, dayTotal, dragging, handlers }) {
  return (
    <div className="board" ref={refs.board}>
      <div className="board-head">
        <div className="track" ref={refs.head}>
          {[0, 5, 10, 15, 20].map(k => (
            <div key={'w' + strip[k]} data-i={k - C} className={'wk' + (strip[k] === monday(today) ? ' now' : '')} style={{ '--i': k - C }}>
              <span className="wk-label">
                <b>Week {isoWeek(strip[k])}</b>
                {fmt(strip[k], { day: 'numeric', month: 'short' })} – {fmt(strip[k + 4], { day: 'numeric', month: 'short' })}
              </span>
            </div>
          ))}
          {strip.map((d, i) => {
            const t = dayTotal(d);
            return (
              <div
                key={d}
                className={'head-cell' + (d === today ? ' today' : '') + (d === monday(d) ? ' mon' : '')}
                style={{ '--i': i - C }}
              >
                <div className="day">
                  <span className="dn">{Number(d.slice(8))}</span>
                  <span className="dmeta">
                    <b>{fmt(d, { weekday: 'short' })}</b>
                  </span>
                  {t > 0 && (
                    <span key={t} className="tot">
                      {t}h
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="board-body" ref={refs.body}>
        <div ref={refs.drum} className={'drum' + (dragging ? ' dragging' : '')} style={{ height }} {...handlers}>
          <div className="track" ref={refs.track}>
            {strip.map((d, i) => (
              <div
                key={d}
                data-day={d}
                className={'panel' + (d === today ? ' today' : '') + (d === monday(d) ? ' mon' : '')}
                style={{ '--i': i - C }}
              >
                {drawn
                  .filter(x => x.days.includes(d))
                  .map(x => (
                    <Piece key={x.key} x={x} d={d} hover={hover} arrive={arrive} />
                  ))}
              </div>
            ))}
            {/* names run across the whole bar, above the day pieces */}
            {drawn.map(x => (
              <Label key={'n' + x.key} x={x} strip={strip} vis={vis} hover={hover} arrive={arrive} noted={noted} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// One day of a bar: tinted block with that day's hours; the first/last day carry the resize edges.
function Piece({ x, d, hover, arrive }) {
  const h = x.hourAt(d) || 0;
  const cls =
    'piece' +
    (d === x.from ? ' first' : '') +
    (d === x.to ? ' last' : '') +
    (x.striped ? ' striped' : '') +
    (x.key === 'draft' ? ' draft' : '') +
    (x.live ? ' live' : '') +
    (x.dim ? ' dim' : '') +
    (hover === x.key ? ' hov' : '') +
    (x.arrive ? ' arrive' : '');
  return (
    <div
      data-bar={x.key}
      className={cls}
      style={{ top: x.top, '--c': x.color, '--from': (x.arrive ? arrive.y : x.top) + 'px' }}
      title={
        x.key === 'draft'
          ? undefined
          : `${x.name} · ${x.label || 'Others'}\n${fmt(d, { weekday: 'short', day: 'numeric', month: 'short' })}: ${h ? h + 'h' : 'no hours'}`
      }
    >
      {d === x.from && <span data-edge="l" className="edge l" />}
      {h > 0 && <span className="hrs">{h}h</span>}
      {d === x.to && <span data-edge="r" className="edge r" />}
    </div>
  );
}

// The task name across every visible day of its bar.
function Label({ x, strip, vis, hover, arrive, noted }) {
  const ds = x.days.filter(d => d >= vis[0] && strip.includes(d));
  if (!ds.length) return null;
  const i0 = strip.indexOf(ds[0]);
  const cls =
    'bar-label' +
    (x.key === 'draft' ? ' draft' : '') +
    (x.dim ? ' dim' : '') +
    (hover === x.key || x.live ? ' hov' : '') +
    (x.arrive ? ' arrive' : '');
  return (
    <div
      className={cls}
      style={{
        '--i': i0 - C,
        '--n': strip.indexOf(ds.at(-1)) - i0 + 1,
        '--s': ds[0] === monday(ds[0]) ? SEAM + 'px' : '0px',
        top: x.top + 4,
        '--from': (x.arrive ? arrive.y : x.top) + 4 + 'px',
      }}
    >
      {x.key === 'draft' ? x.name || `${x.days.length} day${x.days.length > 1 ? 's' : ''}` : x.name}
      {noted.has(x.name) && (
        <span className="noted" title="Has notes">
          ✎
        </span>
      )}
    </div>
  );
}
