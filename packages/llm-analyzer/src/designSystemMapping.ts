/**
 * 디자인 시스템별 컴포넌트 매핑
 *
 * MCP 작업 시 프로젝트의 디자인 시스템을 감지하여,
 * 해당 디자인 시스템이 제공하는 컴포넌트를 자동으로 활용
 */

export interface DesignSystemComponent {
  name: string;
  description: string;
  props?: string[];
  usage?: string;
}

export interface DesignSystemInfo {
  id: string;
  name: string;
  description: string;
  packageName: string;
  docsUrl: string;
  components: Record<string, DesignSystemComponent>;
}

/**
 * 7개 주요 디자인 시스템 매핑
 */
export const DESIGN_SYSTEMS: Record<string, DesignSystemInfo> = {
  'openerd-nuxt3': {
    id: 'openerd-nuxt3',
    name: 'OpenERD Nuxt3',
    description: 'Custom Nuxt3 component library with Common* naming',
    packageName: '@openerd/nuxt3',
    docsUrl: 'https://openerd.com/docs',
    components: {
      table: {
        name: 'CommonTable',
        description: 'Data table component with sorting, filtering, and pagination',
        props: ['data', 'columns', 'loading', 'total', 'page', 'pageSize'],
        usage: '<CommonTable :data="items" :columns="columns" @row-click="handleClick" />'
      },
      button: {
        name: 'CommonButton',
        description: 'Button component with variants and sizes',
        props: ['type', 'size', 'loading', 'disabled'],
        usage: '<CommonButton type="primary" @click="handleClick">Submit</CommonButton>'
      },
      input: {
        name: 'CommonInput',
        description: 'Input field with validation',
        props: ['modelValue', 'placeholder', 'type', 'disabled', 'error'],
        usage: '<CommonInput v-model="value" placeholder="Enter text" />'
      },
      modal: {
        name: 'CommonModal',
        description: 'Modal dialog component',
        props: ['modelValue', 'title', 'width', 'footer'],
        usage: '<CommonModal v-model="visible" title="Title">Content</CommonModal>'
      },
      layout: {
        name: 'CommonLayout',
        description: 'Page layout with sidebar and header',
        props: ['sidebar', 'header'],
        usage: '<CommonLayout><template #header>Header</template>Content</CommonLayout>'
      },
      select: {
        name: 'CommonSelect',
        description: 'Select dropdown component',
        props: ['modelValue', 'options', 'placeholder', 'multiple'],
        usage: '<CommonSelect v-model="selected" :options="options" />'
      },
      paging: {
        name: 'CommonPaging',
        description: 'Pagination component',
        props: ['page', 'pageSize', 'total'],
        usage: '<CommonPaging v-model:page="page" :total="total" />'
      }
    }
  },

  'element-plus': {
    id: 'element-plus',
    name: 'Element Plus',
    description: 'Vue 3 UI library based on Element UI',
    packageName: 'element-plus',
    docsUrl: 'https://element-plus.org',
    components: {
      table: {
        name: 'ElTable',
        description: 'Powerful data table with sorting, filtering, and more',
        props: ['data', 'columns', 'loading', 'height', 'stripe'],
        usage: '<ElTable :data="tableData"><ElTableColumn prop="name" label="Name" /></ElTable>'
      },
      button: {
        name: 'ElButton',
        description: 'Button component with multiple styles',
        props: ['type', 'size', 'loading', 'disabled', 'icon'],
        usage: '<ElButton type="primary" @click="handleClick">Submit</ElButton>'
      },
      input: {
        name: 'ElInput',
        description: 'Input field with various features',
        props: ['modelValue', 'placeholder', 'type', 'disabled', 'clearable'],
        usage: '<ElInput v-model="input" placeholder="Please input" />'
      },
      modal: {
        name: 'ElDialog',
        description: 'Dialog/Modal component',
        props: ['modelValue', 'title', 'width', 'center'],
        usage: '<ElDialog v-model="dialogVisible" title="Tips">Content</ElDialog>'
      },
      layout: {
        name: 'ElContainer',
        description: 'Container layout component',
        props: ['direction'],
        usage: '<ElContainer><ElHeader /><ElMain>Content</ElMain></ElContainer>'
      },
      select: {
        name: 'ElSelect',
        description: 'Select dropdown component',
        props: ['modelValue', 'multiple', 'filterable', 'remote'],
        usage: '<ElSelect v-model="value"><ElOption label="Option" value="1" /></ElSelect>'
      }
    }
  },

  'vuetify': {
    id: 'vuetify',
    name: 'Vuetify',
    description: 'Material Design component framework for Vue',
    packageName: 'vuetify',
    docsUrl: 'https://vuetifyjs.com',
    components: {
      table: {
        name: 'VDataTable',
        description: 'Material Design data table',
        props: ['items', 'headers', 'loading', 'search', 'sort-by'],
        usage: '<VDataTable :items="items" :headers="headers" />'
      },
      button: {
        name: 'VBtn',
        description: 'Material Design button',
        props: ['color', 'size', 'loading', 'disabled', 'icon'],
        usage: '<VBtn color="primary" @click="handleClick">Submit</VBtn>'
      },
      input: {
        name: 'VTextField',
        description: 'Material Design text field',
        props: ['modelValue', 'label', 'type', 'rules', 'hint'],
        usage: '<VTextField v-model="text" label="Label" />'
      },
      modal: {
        name: 'VDialog',
        description: 'Material Design dialog',
        props: ['modelValue', 'width', 'fullscreen', 'persistent'],
        usage: '<VDialog v-model="dialog"><VCard>Content</VCard></VDialog>'
      },
      layout: {
        name: 'VContainer',
        description: 'Responsive container layout',
        props: ['fluid', 'fill-height'],
        usage: '<VContainer><VRow><VCol>Content</VCol></VRow></VContainer>'
      },
      select: {
        name: 'VSelect',
        description: 'Material Design select',
        props: ['modelValue', 'items', 'multiple', 'chips'],
        usage: '<VSelect v-model="selected" :items="items" label="Select" />'
      },
      card: {
        name: 'VCard',
        description: 'Material Design card',
        props: ['elevation', 'outlined', 'tile'],
        usage: '<VCard><VCardTitle>Title</VCardTitle><VCardText>Content</VCardText></VCard>'
      }
    }
  },

  'quasar': {
    id: 'quasar',
    name: 'Quasar Framework',
    description: 'High-performance Vue UI library',
    packageName: 'quasar',
    docsUrl: 'https://quasar.dev',
    components: {
      table: {
        name: 'QTable',
        description: 'Feature-rich data table',
        props: ['rows', 'columns', 'loading', 'pagination', 'filter'],
        usage: '<QTable :rows="rows" :columns="columns" />'
      },
      button: {
        name: 'QBtn',
        description: 'Versatile button component',
        props: ['color', 'size', 'loading', 'disabled', 'icon'],
        usage: '<QBtn color="primary" label="Submit" @click="handleClick" />'
      },
      input: {
        name: 'QInput',
        description: 'Advanced input field',
        props: ['modelValue', 'label', 'type', 'rules', 'hint'],
        usage: '<QInput v-model="text" label="Label" />'
      },
      modal: {
        name: 'QDialog',
        description: 'Dialog component',
        props: ['modelValue', 'persistent', 'maximized'],
        usage: '<QDialog v-model="dialog"><QCard>Content</QCard></QDialog>'
      },
      layout: {
        name: 'QLayout',
        description: 'Page layout component',
        props: ['view'],
        usage: '<QLayout view="lHh Lpr lFf"><QPageContainer><QPage>Content</QPage></QPageContainer></QLayout>'
      },
      select: {
        name: 'QSelect',
        description: 'Select dropdown',
        props: ['modelValue', 'options', 'multiple', 'use-chips'],
        usage: '<QSelect v-model="model" :options="options" />'
      }
    }
  },

  'primevue': {
    id: 'primevue',
    name: 'PrimeVue',
    description: 'Rich UI component library for Vue',
    packageName: 'primevue',
    docsUrl: 'https://primevue.org',
    components: {
      table: {
        name: 'DataTable',
        description: 'Advanced data table with many features',
        props: ['value', 'columns', 'loading', 'paginator', 'rows'],
        usage: '<DataTable :value="products"><Column field="name" header="Name" /></DataTable>'
      },
      button: {
        name: 'Button',
        description: 'PrimeVue button',
        props: ['label', 'icon', 'loading', 'disabled', 'severity'],
        usage: '<Button label="Submit" @click="handleClick" />'
      },
      input: {
        name: 'InputText',
        description: 'Text input component',
        props: ['modelValue', 'placeholder', 'disabled'],
        usage: '<InputText v-model="value" placeholder="Enter text" />'
      },
      modal: {
        name: 'Dialog',
        description: 'Dialog/Modal component',
        props: ['visible', 'header', 'modal', 'style'],
        usage: '<Dialog v-model:visible="display" header="Header">Content</Dialog>'
      },
      select: {
        name: 'Dropdown',
        description: 'Dropdown select component',
        props: ['modelValue', 'options', 'optionLabel', 'filter'],
        usage: '<Dropdown v-model="selectedCity" :options="cities" optionLabel="name" />'
      }
    }
  },

  'ant-design-vue': {
    id: 'ant-design-vue',
    name: 'Ant Design Vue',
    description: 'Enterprise-level UI design system for Vue',
    packageName: 'ant-design-vue',
    docsUrl: 'https://antdv.com',
    components: {
      table: {
        name: 'ATable',
        description: 'Enterprise data table',
        props: ['dataSource', 'columns', 'loading', 'pagination'],
        usage: '<ATable :dataSource="data" :columns="columns" />'
      },
      button: {
        name: 'AButton',
        description: 'Ant Design button',
        props: ['type', 'size', 'loading', 'disabled', 'icon'],
        usage: '<AButton type="primary" @click="handleClick">Submit</AButton>'
      },
      input: {
        name: 'AInput',
        description: 'Input field component',
        props: ['value', 'placeholder', 'disabled', 'allowClear'],
        usage: '<AInput v-model:value="input" placeholder="Input" />'
      },
      modal: {
        name: 'AModal',
        description: 'Modal dialog',
        props: ['visible', 'title', 'width', 'footer'],
        usage: '<AModal v-model:visible="visible" title="Title">Content</AModal>'
      },
      layout: {
        name: 'ALayout',
        description: 'Page layout',
        props: ['hasSider'],
        usage: '<ALayout><AHeader /><AContent>Content</AContent></ALayout>'
      },
      select: {
        name: 'ASelect',
        description: 'Select dropdown',
        props: ['value', 'options', 'mode', 'showSearch'],
        usage: '<ASelect v-model:value="value" :options="options" />'
      }
    }
  },

  'naive-ui': {
    id: 'naive-ui',
    name: 'Naive UI',
    description: 'Vue 3 component library with TypeScript support',
    packageName: 'naive-ui',
    docsUrl: 'https://www.naiveui.com',
    components: {
      table: {
        name: 'NDataTable',
        description: 'Data table with TypeScript support',
        props: ['columns', 'data', 'loading', 'pagination'],
        usage: '<NDataTable :columns="columns" :data="data" />'
      },
      button: {
        name: 'NButton',
        description: 'Button component',
        props: ['type', 'size', 'loading', 'disabled'],
        usage: '<NButton type="primary" @click="handleClick">Submit</NButton>'
      },
      input: {
        name: 'NInput',
        description: 'Input field',
        props: ['value', 'placeholder', 'disabled', 'clearable'],
        usage: '<NInput v-model:value="input" placeholder="Input" />'
      },
      modal: {
        name: 'NModal',
        description: 'Modal dialog',
        props: ['show', 'title', 'preset'],
        usage: '<NModal v-model:show="showModal" title="Title">Content</NModal>'
      },
      layout: {
        name: 'NLayout',
        description: 'Layout component',
        props: ['hasSider', 'embedded'],
        usage: '<NLayout><NLayoutHeader />Content</NLayout>'
      },
      select: {
        name: 'NSelect',
        description: 'Select dropdown',
        props: ['value', 'options', 'multiple', 'filterable'],
        usage: '<NSelect v-model:value="value" :options="options" />'
      },
      card: {
        name: 'NCard',
        description: 'Card component',
        props: ['title', 'bordered', 'hoverable'],
        usage: '<NCard title="Title">Content</NCard>'
      }
    }
  }
};

/**
 * 디자인 시스템 ID로 컴포넌트 정보 가져오기
 */
export function getDesignSystemInfo(designSystemId: string): DesignSystemInfo | undefined {
  return DESIGN_SYSTEMS[designSystemId];
}

/**
 * 특정 컴포넌트 타입에 대한 디자인 시스템 컴포넌트 매핑
 */
export function getComponentForDesignSystem(
  designSystemId: string,
  componentType: string
): DesignSystemComponent | undefined {
  const dsInfo = DESIGN_SYSTEMS[designSystemId];
  if (!dsInfo) return undefined;

  return dsInfo.components[componentType];
}

/**
 * 모든 지원 디자인 시스템 ID 목록
 */
export function getSupportedDesignSystems(): string[] {
  return Object.keys(DESIGN_SYSTEMS);
}

/**
 * 디자인 시스템별 컴포넌트 이름 일괄 변환
 */
export function getComponentMap(designSystemId: string): Record<string, string> {
  const dsInfo = DESIGN_SYSTEMS[designSystemId];
  if (!dsInfo) return {};

  const map: Record<string, string> = {};
  for (const [key, component] of Object.entries(dsInfo.components)) {
    map[key] = component.name;
  }
  return map;
}
