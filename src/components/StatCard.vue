<script setup>
import IconApp from './IconApp.vue'

defineProps({
  label: { type: String, required: true },
  nilai: { type: [String, Number], required: true },
  satuan: { type: String, default: '' },
  awalan: { type: String, default: '' },
  ikon: { type: String, default: 'package' },
  tone: { type: String, default: 'brand' },
  meta: { type: String, default: '' },
  judul: { type: String, default: '' },
})
</script>

<template>
  <article class="stat" :class="`tone-${tone}`" :title="judul || undefined">
    <div class="stat__head">
      <span class="stat__label">{{ label }}</span>
      <span class="stat__icon">
        <IconApp :nama="ikon" :ukuran="18" />
      </span>
    </div>

    <p class="stat__value num">
      <span v-if="awalan" class="stat__prefix">{{ awalan }}</span
      ><span class="stat__number">{{ nilai }}</span
      ><span v-if="satuan" class="stat__unit">{{ satuan }}</span>
    </p>

    <p v-if="meta" class="stat__meta">{{ meta }}</p>
  </article>
</template>

<style scoped>
.stat {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 17px 18px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-card);
  transition: transform 0.18s ease, box-shadow 0.18s ease,
    border-color 0.18s ease;
}

.stat:hover {
  transform: translateY(-2px);
  border-color: var(--border-strong);
  box-shadow: 0 2px 4px rgba(18, 34, 25, 0.03),
    0 18px 40px -26px rgba(18, 34, 25, 0.4);
}

.stat__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.stat__label {
  padding-top: 2px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.005em;
  line-height: 1.35;
}

.stat__icon {
  display: grid;
  width: 33px;
  height: 33px;
  flex: none;
  place-items: center;
  border-radius: 9px;
}

.stat__value {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0;
  margin-top: 14px;
  line-height: 1.1;
}

.stat__prefix {
  margin-right: 3px;
  color: var(--text-secondary);
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.stat__number {
  font-size: 27px;
  font-weight: 750;
  letter-spacing: -0.035em;
  white-space: nowrap;
}

.stat__unit {
  margin-left: 5px;
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
}

.stat__meta {
  margin-top: 7px;
  overflow: hidden;
  color: var(--muted);
  font-size: 11.5px;
  line-height: 1.45;
  text-overflow: ellipsis;
}

.tone-brand .stat__icon {
  background: var(--brand-50);
  color: var(--brand-600);
}

.tone-gold .stat__icon {
  background: var(--gold-50);
  color: var(--gold-600);
}

.tone-clay .stat__icon {
  background: var(--clay-soft);
  color: var(--clay);
}

.tone-teal .stat__icon {
  background: #eaf3f3;
  color: #2a6d6c;
}

@media (max-width: 640px) {
  .stat {
    padding: 14px 13px;
  }

  .stat__label {
    font-size: 11px;
  }

  .stat__icon {
    width: 29px;
    height: 29px;
  }

  .stat__value {
    margin-top: 12px;
  }

  .stat__number {
    font-size: 23px;
    letter-spacing: -0.04em;
  }

  .stat__prefix {
    font-size: 12.5px;
  }

  .stat__unit {
    margin-left: 3px;
    font-size: 10.5px;
  }

  .stat__meta {
    margin-top: 6px;
    font-size: 10.5px;
  }
}

@media (max-width: 380px) {
  .stat {
    padding: 12px;
  }

  .stat__number {
    font-size: 20px;
  }

  .stat__icon {
    width: 26px;
    height: 26px;
  }
}
</style>
