<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import RymIcon from '../components/RymIcon.vue'

export type FacetOption = {
  value: string
  label: string
  count: number
  disabled?: boolean
}

const props=defineProps<{
  label:string
  placeholder:string
  modelValue:string[]
  options:FacetOption[]
}>()

const emit=defineEmits<{
  'update:modelValue':[value:string[]]
}>()

const open=ref(false)
const root=ref<HTMLElement|null>(null)

const selectedLabel=computed(()=>{
  if(!props.modelValue.length) return props.placeholder
  if(props.modelValue.length===1) return props.modelValue[0]
  return `${props.modelValue.length} seleccionados`
})

function toggle(value:string){
  const set=new Set(props.modelValue)
  if(set.has(value)) set.delete(value)
  else set.add(value)
  emit('update:modelValue',[...set])
  open.value=false
}
function clear(){
  emit('update:modelValue',[])
  open.value=false
}
function clickOutside(e:MouseEvent){
  if(root.value && !root.value.contains(e.target as Node)) open.value=false
}
onMounted(()=>document.addEventListener('click',clickOutside))
onBeforeUnmount(()=>document.removeEventListener('click',clickOutside))
</script>

<template>
  <div ref="root" class="facet">
    <span class="facet-label">{{label}}</span>
    <button type="button" class="facet-trigger" :class="{active:modelValue.length>0,open}" @click.stop="open=!open">
      <span class="facet-trigger-copy">
        <b>{{selectedLabel}}</b>
        <small v-if="modelValue.length">{{modelValue.length}} filtro{{modelValue.length===1?'':'s'}} activo{{modelValue.length===1?'':'s'}}</small>
      </span>
      <span v-if="modelValue.length" class="facet-count">{{modelValue.length}}</span>
      <RymIcon name="expand_more" :size="17"/>
    </button>

    <div v-if="open" class="facet-popover" @click.stop>
      <header>
        <div>
          <small>FILTRO INTELIGENTE</small>
          <b>{{label}}</b>
        </div>
        <button v-if="modelValue.length" type="button" @click="clear">Limpiar</button>
      </header>
      <div class="facet-options">
        <label v-for="option in options" :key="option.value" :class="{disabled:option.disabled}">
          <input
            type="checkbox"
            :checked="modelValue.includes(option.value)"
            :disabled="option.disabled && !modelValue.includes(option.value)"
            @change="toggle(option.value)"
          >
          <span>{{option.label}}</span>
          <b>{{option.count}}</b>
        </label>
        <div v-if="!options.length" class="facet-empty">Sin opciones para el contexto actual.</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.facet{position:relative;min-width:0;display:grid;gap:5px}
.facet-label{color:#7B899C;font-size:8px;font-weight:850;letter-spacing:.055em;text-transform:uppercase}
.facet-trigger{
  width:100%;min-height:42px;display:flex!important;align-items:center!important;gap:8px!important;
  padding:7px 10px!important;border:1px solid #D8E3F2!important;border-radius:10px!important;
  background:#fff!important;color:#203253!important;text-align:left!important;cursor:pointer!important;
}
.facet-trigger:hover,.facet-trigger.open{border-color:#AFC9EB!important;box-shadow:0 0 0 3px rgba(36,74,165,.05)!important}
.facet-trigger.active{background:#F6F9FF!important;border-color:#B9D0EF!important}
.facet-trigger-copy{min-width:0;flex:1;display:grid;gap:2px}
.facet-trigger-copy b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;color:#10224E}
.facet-trigger-copy small{font-size:8px;color:#6D7D94}
.facet-count{
  min-width:20px;height:20px;display:grid;place-items:center;padding:0 5px;border-radius:999px;
  background:#244AA5;color:#fff;font-size:8px;font-weight:900;
}
.facet-popover{
  position:absolute;z-index:80;top:calc(100% + 7px);left:0;width:min(330px,90vw);
  border:1px solid #C9D8EA;border-radius:12px;background:#fff;
  box-shadow:0 18px 48px rgba(15,35,68,.18);overflow:hidden;
}
.facet-popover header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 12px;border-bottom:1px solid #E4EBF4;background:#F8FAFD}
.facet-popover header>div{display:grid;gap:2px}.facet-popover header small{font-size:7px;color:#8290A4;font-weight:850;letter-spacing:.07em}.facet-popover header b{font-size:10px;color:#244AA5}
.facet-popover header button{border:0!important;background:transparent!important;color:#244AA5!important;font-size:8px!important;font-weight:850!important;cursor:pointer!important}
.facet-options{max-height:320px;overflow:auto;padding:6px}
.facet-options label{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:9px;padding:9px 8px;border-radius:8px;cursor:pointer}
.facet-options label:hover{background:#F4F7FB}.facet-options label.disabled{opacity:.42}
.facet-options input{width:16px;height:16px;accent-color:#244AA5}.facet-options span{font-size:10px;color:#314665}.facet-options b{min-width:27px;padding:3px 5px;border-radius:999px;background:#EEF3F9;color:#61728A;font-size:8px;text-align:center}
.facet-options label:has(input:checked){background:#EEF5FF}.facet-options label:has(input:checked) span{color:#173A88;font-weight:800}.facet-options label:has(input:checked) b{background:#DDEBFF;color:#244AA5}
.facet-empty{padding:18px 12px;color:#8290A4;font-size:9px;text-align:center}
</style>

<style scoped>
/* darker, cleaner smart-select treatment + safer popover geometry */
.facet{z-index:20}
.facet:has(.facet-popover){z-index:90}
.facet-label{color:#5F718B;font-size:8px}
.facet-trigger{
  min-height:46px!important;
  border-color:#C6D5E8!important;
  border-radius:11px!important;
  background:linear-gradient(180deg,#FFFFFF 0%,#FAFCFF 100%)!important;
  box-shadow:0 3px 10px rgba(20,52,101,.035)!important;
}
.facet-trigger:hover,.facet-trigger.open{
  border-color:#6F9FDC!important;
  box-shadow:0 0 0 3px rgba(23,78,166,.09)!important;
}
.facet-trigger.active{
  background:#EAF2FF!important;
  border-color:#8DB1E1!important;
}
.facet-trigger-copy b{font-size:10px;color:#0B1F4D}
.facet-trigger-copy small{color:#5E7089}
.facet-count{background:#174EA6}
.facet-popover{
  width:min(360px,calc(100vw - 48px));
  max-width:calc(100vw - 48px);
  border-color:#B9CDE5;
  border-radius:13px;
  box-shadow:0 22px 56px rgba(9,31,73,.22);
}
.facet:nth-child(3n) .facet-popover{left:auto;right:0}
.facet-popover header{
  background:#EEF4FD;
  border-bottom-color:#CAD8EA;
}
.facet-popover header small{color:#62748E}
.facet-popover header b{color:#174EA6;font-size:11px}
.facet-options{max-height:300px}
.facet-options label{
  min-height:38px;
  border:1px solid transparent;
}
.facet-options label:hover{
  background:#F2F6FB;border-color:#E1EAF4;
}
.facet-options label:has(input:checked){
  background:#E9F1FF;border-color:#C6D9F1;
}
.facet-options span{
  min-width:0;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  color:#263B5C;
}
.facet-options b{background:#E8EEF6;color:#526681}
@media(max-width:1080px){
  .facet:nth-child(3n) .facet-popover{left:0;right:auto}
  .facet:nth-child(2n) .facet-popover{left:auto;right:0}
}
@media(max-width:720px){
  .facet-popover{position:fixed;left:16px!important;right:16px!important;top:18vh;width:auto;max-width:none}
}
</style>
