<template>
  <div class="rym-tw space-y-6 pb-12">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div class="absolute -right-10 -bottom-10 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div>
        <div class="flex items-center gap-3 mb-1">
          <div class="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 font-bold text-lg shadow-inner">
            👥
          </div>
          <div>
            <h1 class="text-2xl font-black text-white tracking-tight">Administración de Usuarios</h1>
            <p class="text-xs font-medium text-slate-400">Gestión de accesos, roles, supervisión y permisos por módulo</p>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <button
          @click="loadData"
          :disabled="loading"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 transition active:scale-95 disabled:opacity-50"
        >
          <svg class="w-4 h-4" :class="{ 'animate-spin': loading }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </button>
      </div>
    </div>

    <!-- Alert / Message Banner -->
    <div v-if="globalMsg" :class="globalMsg.type === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'" class="p-4 rounded-xl border text-xs font-medium flex items-center justify-between">
      <span>{{ globalMsg.text }}</span>
      <button @click="globalMsg = null" class="text-slate-400 hover:text-white">&times;</button>
    </div>

    <!-- Supervisoras Detectadas (Pending Detection from Panapass) -->
    <div v-if="pendingDetected.length > 0" class="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-5 shadow-lg space-y-4">
      <div class="flex items-center justify-between border-b border-amber-500/20 pb-3">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
          <h2 class="text-sm font-bold text-amber-200 uppercase tracking-wider">Nuevas Supervisoras Detectadas</h2>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {{ pendingDetected.length }} pendiente{{ pendingDetected.length === 1 ? '' : 's' }}
          </span>
        </div>
        <span class="text-[11px] text-amber-300/70 font-medium">Asignación automática desde Consulta Panapass</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="det in pendingDetected"
          :key="det.id"
          class="bg-slate-900/80 border border-amber-500/20 rounded-xl p-4 space-y-3"
        >
          <div class="flex items-start justify-between">
            <div>
              <h3 class="text-sm font-bold text-white">{{ det.nombre_detectado }}</h3>
              <p class="text-[11px] text-slate-400">
                {{ det.total_unidades || 0 }} unidades detectadas · Sugerida: <strong class="text-amber-300">{{ det.galera_sugerida || 'POR CONFIRMAR' }}</strong>
              </p>
            </div>
            <span class="px-2 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-300 uppercase tracking-wider border border-amber-500/30">
              PENDIENTE
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <label class="block text-[10px] text-slate-400 mb-1">Nombre</label>
              <input v-model="detForms[det.id].nombre" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white" />
            </div>
            <div>
              <label class="block text-[10px] text-slate-400 mb-1">Galera</label>
              <select v-model="detForms[det.id].galera" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white">
                <option v-for="g in galerasList" :key="g" :value="g">{{ g }}</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] text-slate-400 mb-1">Correo</label>
              <input v-model="detForms[det.id].email" type="email" placeholder="correo@empresa.com" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white" />
            </div>
            <div>
              <label class="block text-[10px] text-slate-400 mb-1">Clave temporal</label>
              <input v-model="detForms[det.id].password" type="password" minlength="6" placeholder="Mín. 6 chars" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white" />
            </div>
          </div>

          <div class="text-[11px] text-slate-400 bg-slate-950/50 p-2 rounded-lg border border-slate-800/60 truncate">
            <span class="text-slate-500 font-semibold">Unidades:</span> {{ (det.unidades || []).slice(0, 10).join(', ') }}{{ (det.unidades || []).length > 10 ? ' …' : '' }}
          </div>

          <div class="flex items-center justify-between pt-1">
            <label class="inline-flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
              <input type="checkbox" v-model="detForms[det.id].must_change_password" class="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0">
              Forzar cambio de clave
            </label>
            <button
              @click="registerDetectedSupervisor(det.id)"
              :disabled="submittingDet === det.id"
              class="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold rounded-lg text-xs transition disabled:opacity-50"
            >
              {{ submittingDet === det.id ? 'Registrando...' : 'Registrar Supervisora' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Grid: Create Form + Users List -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Create User Card (Left Column) -->
      <div class="lg:col-span-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-4">
        <div class="border-b border-slate-800/80 pb-3">
          <h2 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-indigo-400"></span>
            Crear Usuario
          </h2>
          <p class="text-[11px] text-slate-400 mt-0.5">El username se genera automáticamente del primer nombre.</p>
        </div>

        <form @submit.prevent="handleCreateUser" class="space-y-3.5">
          <div>
            <label class="block text-[11px] font-semibold text-slate-300 mb-1">Nombre completo</label>
            <input
              v-model="newUser.nombre"
              @input="onNameInput"
              placeholder="Ej. Dayana Prieto"
              required
              class="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 transition"
            />
          </div>

          <div>
            <label class="block text-[11px] font-semibold text-slate-300 mb-1">Usuario generado</label>
            <input
              :value="generatedUsername"
              readonly
              placeholder="Se genera automáticamente"
              class="w-full bg-slate-900/90 border border-slate-800/80 rounded-xl px-3 py-2 text-xs font-mono font-bold text-indigo-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label class="block text-[11px] font-semibold text-slate-300 mb-1">Correo electrónico</label>
            <input
              v-model="newUser.email"
              type="email"
              placeholder="correo@empresa.com"
              required
              class="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 transition"
            />
          </div>

          <div>
            <label class="block text-[11px] font-semibold text-slate-300 mb-1">Contraseña temporal</label>
            <input
              v-model="newUser.password"
              type="password"
              minlength="6"
              placeholder="Mínimo 6 caracteres"
              required
              class="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 transition"
            />
          </div>

          <div>
            <label class="block text-[11px] font-semibold text-slate-300 mb-1">Rol</label>
            <select
              v-model="newUser.rol"
              class="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white transition"
            >
              <option v-for="r in rolesList" :key="r" :value="r">{{ r }}</option>
            </select>
          </div>

          <!-- Galeras Scope (Multi) -->
          <div>
            <label class="block text-[11px] font-semibold text-slate-300 mb-1">Galera(s) (Gerente / Admin)</label>
            <select
              v-model="newUser.galeras_scope"
              multiple
              class="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-2 text-xs text-white transition h-20"
            >
              <option v-for="g in galerasList" :key="g" :value="g">{{ g }}</option>
            </select>
            <p class="text-[10px] text-slate-500 mt-1">Usa Ctrl / Cmd para seleccionar múltiples.</p>
          </div>

          <!-- Supervisora(s) -->
          <div v-if="newUser.rol === 'SUPERVISORA'">
            <label class="block text-[11px] font-semibold text-slate-300 mb-1">Supervisora(s) vinculadas</label>
            <select
              v-model="newUser.supervisora_ids"
              multiple
              class="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-2 text-xs text-white transition h-24"
            >
              <option v-for="s in supervisorasList" :key="s.id" :value="s.id">
                {{ s.nombre }} ({{ s.galera || 'Sin Galera' }})
              </option>
            </select>
          </div>

          <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              v-model="newUser.must_change_password"
              class="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
            />
            Obligar cambio de contraseña en primer login
          </label>

          <button
            type="submit"
            :disabled="creating"
            class="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
          >
            {{ creating ? 'Creando...' : 'Crear Usuario' }}
          </button>
        </form>
      </div>

      <!-- Users List (Right Column) -->
      <div class="lg:col-span-8 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-4">
        <!-- Header & Search Toolbar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <h2 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
              Usuarios del Sistema
            </h2>
            <p class="text-[11px] text-slate-400 mt-0.5">{{ usersList.length }} cuentas registradas ({{ activeCount }} activas)</p>
          </div>

          <div class="relative w-full sm:w-64">
            <input
              v-model="searchQuery"
              placeholder="Buscar por nombre, usuario, rol..."
              class="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-600 transition"
            />
            <svg class="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <!-- Users Table -->
        <div class="overflow-x-auto rounded-xl border border-slate-800/80">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-950/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <th class="py-3 px-3">Usuario / Nombre</th>
                <th class="py-3 px-3">Correo</th>
                <th class="py-3 px-3">Rol</th>
                <th class="py-3 px-3">Supervisora(s)</th>
                <th class="py-3 px-3 text-center">Estado</th>
                <th class="py-3 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/50 text-xs">
              <tr v-if="loading && usersList.length === 0">
                <td colspan="6" class="py-8 text-center text-slate-500 text-xs">Cargando usuarios...</td>
              </tr>
              <tr v-else-if="filteredUsers.length === 0">
                <td colspan="6" class="py-8 text-center text-slate-500 text-xs">No se encontraron usuarios coincidentes.</td>
              </tr>
              <tr
                v-for="u in filteredUsers"
                :key="u.id"
                class="hover:bg-slate-800/30 transition group"
              >
                <td class="py-2.5 px-3">
                  <div class="font-bold text-white group-hover:text-indigo-300 transition">{{ u.nombre }}</div>
                  <div class="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                    <span>@{{ u.usuario || '-' }}</span>
                    <span v-if="u.must_change_password" class="text-amber-400" title="Cambio de clave pendiente">⚠️</span>
                  </div>
                </td>
                <td class="py-2.5 px-3 text-slate-300 font-mono text-[11px]">{{ u.email || '-' }}</td>
                <td class="py-2.5 px-3">
                  <span
                    class="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border"
                    :class="getRoleBadgeClass(u.rol)"
                  >
                    {{ u.rol }}
                  </span>
                </td>
                <td class="py-2.5 px-3 text-slate-400 text-[11px]">
                  <span v-if="u.supervisoras && u.supervisoras.length > 0">
                    {{ u.supervisoras.map((s: any) => s.nombre || s.id).join(', ') }}
                  </span>
                  <span v-else class="text-slate-600">-</span>
                </td>
                <td class="py-2.5 px-3 text-center">
                  <span
                    class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                    :class="u.activo ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'"
                  >
                    {{ u.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="py-2.5 px-3 text-right space-x-2">
                  <button
                    @click="openUserModal(u)"
                    class="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 transition"
                  >
                    Administrar
                  </button>
                  <button
                    @click="handleDeleteUser(u)"
                    class="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 transition"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- User Detail / Edit Modal -->
    <div
      v-if="editingUser"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      @click.self="editingUser = null"
    >
      <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
          <div>
            <h3 class="text-base font-bold text-white">{{ editingUser.nombre }}</h3>
            <p class="text-xs text-slate-400 font-mono">@{{ editingUser.usuario || '-' }} · {{ editingUser.email }}</p>
          </div>
          <button @click="editingUser = null" class="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition">
            &times;
          </button>
        </div>

        <!-- Modal Tabs -->
        <div class="flex border-b border-slate-800 bg-slate-950/30 px-5 pt-2 gap-4">
          <button
            @click="activeModalTab = 'datos'"
            :class="activeModalTab === 'datos' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-slate-200'"
            class="pb-2 text-xs font-bold transition"
          >
            Datos Generales
          </button>
          <button
            @click="activeModalTab = 'permisos'"
            :class="activeModalTab === 'permisos' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-slate-200'"
            class="pb-2 text-xs font-bold transition"
          >
            Permisos por Módulo
          </button>
          <button
            @click="activeModalTab = 'seguridad'"
            :class="activeModalTab === 'seguridad' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-slate-200'"
            class="pb-2 text-xs font-bold transition"
          >
            Seguridad y Clave
          </button>
        </div>

        <!-- Modal Content Area -->
        <div class="p-5 overflow-y-auto space-y-4 flex-1">
          <!-- TAB 1: DATOS GENERALES -->
          <div v-if="activeModalTab === 'datos'" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-semibold text-slate-300 mb-1">Nombre</label>
                <input v-model="editForm.nombre" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-slate-300 mb-1">Usuario</label>
                <input :value="editingUser.usuario" readonly class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-400 cursor-not-allowed" />
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-slate-300 mb-1">Correo</label>
                <input v-model="editForm.email" type="email" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-slate-300 mb-1">Rol</label>
                <select v-model="editForm.rol" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                  <option v-for="r in rolesList" :key="r" :value="r">{{ r }}</option>
                </select>
              </div>
            </div>

            <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
              <input type="checkbox" v-model="editForm.activo" class="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0" />
              Usuario Activo
            </label>

            <div>
              <label class="block text-[11px] font-semibold text-slate-300 mb-1">Galera(s) Asignadas</label>
              <select v-model="editForm.galeras_scope" multiple class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white h-20">
                <option v-for="g in galerasList" :key="g" :value="g">{{ g }}</option>
              </select>
            </div>

            <div>
              <label class="block text-[11px] font-semibold text-slate-300 mb-1">Supervisora(s) Vinculadas</label>
              <select v-model="editForm.supervisora_ids" multiple class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white h-24">
                <option v-for="s in supervisorasList" :key="s.id" :value="s.id">
                  {{ s.nombre }} ({{ s.galera || 'Sin Galera' }})
                </option>
              </select>
            </div>

            <div class="pt-2 flex justify-end">
              <button
                @click="saveUserData"
                :disabled="savingUser"
                class="py-2 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition disabled:opacity-50"
              >
                {{ savingUser ? 'Guardando...' : 'Guardar Datos' }}
              </button>
            </div>
          </div>

          <!-- TAB 2: PERMISOS -->
          <div v-if="activeModalTab === 'permisos'" class="space-y-4">
            <p class="text-xs text-slate-400">Define qué puede ver, crear, editar o eliminar este usuario en cada módulo.</p>
            <div class="overflow-x-auto rounded-xl border border-slate-800">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-slate-950/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <th class="py-2.5 px-3">Módulo</th>
                    <th class="py-2.5 px-2 text-center">Ver</th>
                    <th class="py-2.5 px-2 text-center">Crear</th>
                    <th class="py-2.5 px-2 text-center">Editar</th>
                    <th class="py-2.5 px-2 text-center">Eliminar</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/50">
                  <tr v-for="m in modulosList" :key="m.codigo" class="hover:bg-slate-800/20">
                    <td class="py-2 px-3 font-semibold text-slate-200">{{ m.nombre }}</td>
                    <td class="py-2 px-2 text-center">
                      <input type="checkbox" v-model="permsMap[m.codigo].puede_ver" class="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0" />
                    </td>
                    <td class="py-2 px-2 text-center">
                      <input type="checkbox" v-model="permsMap[m.codigo].puede_crear" class="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0" />
                    </td>
                    <td class="py-2 px-2 text-center">
                      <input type="checkbox" v-model="permsMap[m.codigo].puede_editar" class="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0" />
                    </td>
                    <td class="py-2 px-2 text-center">
                      <input type="checkbox" v-model="permsMap[m.codigo].puede_eliminar" class="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="pt-2 flex justify-end">
              <button
                @click="savePermissions"
                :disabled="savingPerms"
                class="py-2 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition disabled:opacity-50"
              >
                {{ savingPerms ? 'Guardando...' : 'Guardar Permisos' }}
              </button>
            </div>
          </div>

          <!-- TAB 3: SEGURIDAD -->
          <div v-if="activeModalTab === 'seguridad'" class="space-y-4">
            <div class="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
              <div class="text-xs text-slate-300 font-semibold">Estado de la contraseña</div>
              <div class="text-[11px] text-slate-400">
                {{ editingUser.must_change_password ? '⚠️ Cambio obligatorio pendiente en el próximo inicio.' : '✅ Sin cambio obligatorio pendiente.' }}
              </div>
            </div>

            <div class="space-y-3">
              <div>
                <label class="block text-[11px] font-semibold text-slate-300 mb-1">Nueva Contraseña Temporal</label>
                <input
                  v-model="newPasswordTmp"
                  type="password"
                  minlength="6"
                  placeholder="Mínimo 6 caracteres"
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input type="checkbox" v-model="forcePasswordChange" class="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0" />
                Obligar cambio en el próximo inicio
              </label>

              <button
                @click="handleSetPassword"
                :disabled="savingPass"
                class="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition disabled:opacity-50"
              >
                {{ savingPass ? 'Asignando...' : 'Asignar Contraseña' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { callPortalFunction } from '../portalApi'

interface UserItem {
  id: string
  nombre: string
  email: string
  usuario?: string
  rol: string
  activo: boolean
  must_change_password?: boolean
  galeras_scope?: string[]
  supervisoras?: Array<{ id: string; nombre: string; galera?: string }>
  source_system?: string
  source_area?: string
  source_funcion?: string
}

interface SupervisoraItem {
  id: string
  nombre: string
  galera?: string
}

interface ModuloItem {
  codigo: string
  nombre: string
}

interface DetectedSupItem {
  id: string
  nombre_detectado: string
  total_unidades?: number
  galera_sugerida?: string
  unidades?: string[]
}

const rolesList = ['SUPERVISORA', 'GERENTE_GALERA', 'PAGADOR', 'OPERATIVO', 'ADMIN', 'SISTEMA', 'ADMIN_TOTAL']
const galerasList = ref<string[]>(['VCARS', 'VCOMP', 'VIPCO', 'VINDU'])

const loading = ref(false)
const globalMsg = ref<{ type: 'error' | 'success'; text: string } | null>(null)

const usersList = ref<UserItem[]>([])
const supervisorasList = ref<SupervisoraItem[]>([])
const modulosList = ref<ModuloItem[]>([])
const rolePerms = ref<any[]>([])
const userPerms = ref<any[]>([])
const pendingDetected = ref<DetectedSupItem[]>([])

const searchQuery = ref('')

// Form Create User
const newUser = ref({
  nombre: '',
  email: '',
  password: '',
  rol: 'SUPERVISORA',
  galeras_scope: [] as string[],
  supervisora_ids: [] as string[],
  must_change_password: true
})
const creating = ref(false)

// Detected Supervisors Forms state
const detForms = ref<Record<string, {
  nombre: string
  galera: string
  email: string
  whatsapp: string
  password: string
  must_change_password: boolean
}>>({})
const submittingDet = ref<string | null>(null)

// Modal State
const editingUser = ref<UserItem | null>(null)
const activeModalTab = ref<'datos' | 'permisos' | 'seguridad'>('datos')
const editForm = ref({
  nombre: '',
  email: '',
  rol: '',
  activo: true,
  galeras_scope: [] as string[],
  supervisora_ids: [] as string[]
})
const permsMap = ref<Record<string, { puede_ver: boolean; puede_crear: boolean; puede_editar: boolean; puede_eliminar: boolean }>>({})
const savingUser = ref(false)
const savingPerms = ref(false)

// Password State
const newPasswordTmp = ref('')
const forcePasswordChange = ref(true)
const savingPass = ref(false)

const normalizeFirstName = (name: string) => {
  return String(name || '')
    .trim()
    .split(/\s+/)[0]
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

const generatedUsername = computed(() => {
  return normalizeFirstName(newUser.value.nombre)
})

const onNameInput = () => {
  // Triggers reactivity
}

const activeCount = computed(() => {
  return usersList.value.filter(u => u.activo).length
})

const filteredUsers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return usersList.value
  return usersList.value.filter(u =>
    (u.nombre || '').toLowerCase().includes(q) ||
    (u.usuario || '').toLowerCase().includes(q) ||
    (u.email || '').toLowerCase().includes(q) ||
    (u.rol || '').toLowerCase().includes(q)
  )
})

const getRoleBadgeClass = (rol: string) => {
  switch (rol) {
    case 'ADMIN_TOTAL':
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    case 'ADMIN':
      return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
    case 'GERENTE_GALERA':
      return 'bg-sky-500/20 text-sky-300 border-sky-500/30'
    case 'SUPERVISORA':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    case 'PAGADOR':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    default:
      return 'bg-slate-800 text-slate-400 border-slate-700'
  }
}

const loadData = async () => {
  loading.value = true
  globalMsg.value = null
  try {
    const res = await callPortalFunction<{
      ok: boolean
      error?: string
      users?: UserItem[]
      supervisoras?: SupervisoraItem[]
      galeras?: string[]
      modulos?: ModuloItem[]
      rol_permisos?: any[]
      usuario_permisos?: any[]
      supervisoras_detectadas?: DetectedSupItem[]
    }>('admin-users', { action: 'list' })

    if (!res?.ok) throw new Error(res?.error || 'No se pudieron cargar usuarios')

    usersList.value = res.users || []
    supervisorasList.value = res.supervisoras || []
    if (res.galeras && res.galeras.length > 0) {
      galerasList.value = res.galeras
    }
    modulosList.value = (res.modulos || []).filter(m => !['operacion_am', 'operacion_pm', 'pendientes_externo'].includes(m.codigo))
    rolePerms.value = res.rol_permisos || []
    userPerms.value = res.usuario_permisos || []
    pendingDetected.value = res.supervisoras_detectadas || []

    // Initialize detection forms
    pendingDetected.value.forEach(det => {
      if (!detForms.value[det.id]) {
        detForms.value[det.id] = {
          nombre: det.nombre_detectado || '',
          galera: det.galera_sugerida || galerasList.value[0] || 'VCARS',
          email: '',
          whatsapp: '',
          password: '',
          must_change_password: true
        }
      }
    })
  } catch (err: any) {
    globalMsg.value = { type: 'error', text: err?.message || 'Error cargando datos de usuarios' }
  } finally {
    loading.value = false
  }
}

const handleCreateUser = async () => {
  if (!newUser.value.nombre || !newUser.value.email || newUser.value.password.length < 6) {
    globalMsg.value = { type: 'error', text: 'Completa nombre, email y contraseña de al menos 6 caracteres.' }
    return
  }
  creating.value = true
  globalMsg.value = null
  try {
    const res = await callPortalFunction<{ ok: boolean; error?: string; usuario?: string }>('admin-users', {
      action: 'create',
      nombre: newUser.value.nombre,
      email: newUser.value.email,
      password: newUser.value.password,
      rol: newUser.value.rol,
      supervisora_ids: newUser.value.supervisora_ids,
      galeras_scope: newUser.value.galeras_scope,
      must_change_password: newUser.value.must_change_password
    })
    if (!res?.ok) throw new Error(res?.error || 'No se pudo crear el usuario')

    globalMsg.value = { type: 'success', text: `Usuario @${res.usuario} creado correctamente.` }
    newUser.value = {
      nombre: '',
      email: '',
      password: '',
      rol: 'SUPERVISORA',
      galeras_scope: [],
      supervisora_ids: [],
      must_change_password: true
    }
    await loadData()
  } catch (err: any) {
    globalMsg.value = { type: 'error', text: err?.message || 'Error al crear usuario' }
  } finally {
    creating.value = false
  }
}

const handleDeleteUser = async (u: UserItem) => {
  if (!confirm(`¿Eliminar al usuario ${u.nombre} (@${u.usuario})?\nEsta acción eliminará sus accesos y permisos.`)) return
  try {
    const res = await callPortalFunction<{ ok: boolean; error?: string }>('admin-users', {
      action: 'delete',
      id: u.id
    })
    if (!res?.ok) throw new Error(res?.error || 'No se pudo eliminar el usuario')
    globalMsg.value = { type: 'success', text: `Usuario ${u.nombre} eliminado.` }
    await loadData()
  } catch (err: any) {
    globalMsg.value = { type: 'error', text: err?.message || 'Error al eliminar usuario' }
  }
}

const registerDetectedSupervisor = async (detId: string) => {
  const f = detForms.value[detId]
  if (!f || !f.nombre || !f.galera || !f.email || f.password.length < 6) {
    alert('Completa nombre, galera, correo y una clave temporal de al menos 6 caracteres.')
    return
  }
  if (!confirm(`¿Registrar a ${f.nombre} como supervisora de ${f.galera}?`)) return
  submittingDet.value = detId
  try {
    const res = await callPortalFunction<{ ok: boolean; error?: string; usuario?: string }>('admin-users', {
      action: 'register_detected_supervisor',
      detection_id: detId,
      nombre: f.nombre,
      galera: f.galera,
      email: f.email,
      whatsapp: f.whatsapp,
      password: f.password,
      must_change_password: f.must_change_password
    })
    if (!res?.ok) throw new Error(res?.error || 'No se pudo registrar la supervisora')
    globalMsg.value = { type: 'success', text: `Supervisora registrada. Usuario creado: @${res.usuario}` }
    await loadData()
  } catch (err: any) {
    alert(err?.message || 'Error al registrar supervisora detectada')
  } finally {
    submittingDet.value = null
  }
}

const openUserModal = (u: UserItem) => {
  editingUser.value = u
  activeModalTab.value = 'datos'
  editForm.value = {
    nombre: u.nombre || '',
    email: u.email || '',
    rol: u.rol || 'SUPERVISORA',
    activo: u.activo,
    galeras_scope: u.galeras_scope ? [...u.galeras_scope] : [],
    supervisora_ids: (u.supervisoras || []).map(s => s.id)
  }

  // Pre-fill permissions
  const base = new Map(rolePerms.value.filter(x => x.rol === u.rol).map(x => [x.modulo_codigo, x]))
  const ov = new Map(userPerms.value.filter(x => x.user_id === u.id).map(x => [x.modulo_codigo, x]))
  const effective = (modCode: string, field: string) => {
    if (ov.has(modCode)) return !!ov.get(modCode)[field]
    return !!base.get(modCode)?.[field]
  }

  const map: Record<string, { puede_ver: boolean; puede_crear: boolean; puede_editar: boolean; puede_eliminar: boolean }> = {}
  modulosList.value.forEach(m => {
    map[m.codigo] = {
      puede_ver: effective(m.codigo, 'puede_ver'),
      puede_crear: effective(m.codigo, 'puede_crear'),
      puede_editar: effective(m.codigo, 'puede_editar'),
      puede_eliminar: effective(m.codigo, 'puede_eliminar')
    }
  })
  permsMap.value = map
  newPasswordTmp.value = ''
  forcePasswordChange.value = true
}

const saveUserData = async () => {
  if (!editingUser.value) return
  savingUser.value = true
  try {
    const res = await callPortalFunction<{ ok: boolean; error?: string }>('admin-users', {
      action: 'update',
      id: editingUser.value.id,
      nombre: editForm.value.nombre,
      email: editForm.value.email,
      rol: editForm.value.rol,
      activo: editForm.value.activo,
      supervisora_ids: editForm.value.supervisora_ids,
      galeras_scope: editForm.value.galeras_scope
    })
    if (!res?.ok) throw new Error(res?.error || 'No se pudo actualizar el usuario')
    globalMsg.value = { type: 'success', text: `Datos de ${editForm.value.nombre} actualizados.` }
    editingUser.value = null
    await loadData()
  } catch (err: any) {
    alert(err?.message || 'Error al actualizar usuario')
  } finally {
    savingUser.value = false
  }
}

const savePermissions = async () => {
  if (!editingUser.value) return
  savingPerms.value = true
  try {
    const perms = modulosList.value.map(m => ({
      modulo_codigo: m.codigo,
      puede_ver: permsMap.value[m.codigo]?.puede_ver ?? false,
      puede_crear: permsMap.value[m.codigo]?.puede_crear ?? false,
      puede_editar: permsMap.value[m.codigo]?.puede_editar ?? false,
      puede_eliminar: permsMap.value[m.codigo]?.puede_eliminar ?? false
    }))
    const res = await callPortalFunction<{ ok: boolean; error?: string }>('admin-users', {
      action: 'permissions',
      id: editingUser.value.id,
      permisos: perms
    })
    if (!res?.ok) throw new Error(res?.error || 'No se pudieron actualizar los permisos')
    globalMsg.value = { type: 'success', text: `Permisos actualizados para ${editingUser.value.nombre}.` }
    editingUser.value = null
    await loadData()
  } catch (err: any) {
    alert(err?.message || 'Error al guardar permisos')
  } finally {
    savingPerms.value = false
  }
}

const handleSetPassword = async () => {
  if (!editingUser.value || newPasswordTmp.value.length < 6) {
    alert('La contraseña debe tener al menos 6 caracteres.')
    return
  }
  savingPass.value = true
  try {
    const res = await callPortalFunction<{ ok: boolean; error?: string }>('admin-users', {
      action: 'set_password',
      id: editingUser.value.id,
      password: newPasswordTmp.value,
      must_change_password: forcePasswordChange.value
    })
    if (!res?.ok) throw new Error(res?.error || 'No se pudo asignar la contraseña')
    globalMsg.value = { type: 'success', text: `Contraseña asignada para ${editingUser.value.nombre}.` }
    editingUser.value = null
    await loadData()
  } catch (err: any) {
    alert(err?.message || 'Error al asignar contraseña')
  } finally {
    savingPass.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>
