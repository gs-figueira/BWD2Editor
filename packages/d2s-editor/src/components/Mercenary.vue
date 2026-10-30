<template>
  <!-- BW: BlackWolf mercs equip every slot except the weapon swap (helm, amulet, armor, both hands,
       rings, belt, boots, gloves), so reuse the character panel layout without the inventory grid -->
  <div class="inventory merc-inventory">
    <div class="equipped">
      <span v-for="slot in slots" :key="slot.id" :class="slot.cls"
          v-on:drop="drop($event, slot.id)"
          v-on:dragover="dragover"
          v-on:dragenter="dragenter($event, slot.id)"
          v-on:dragleave="dragleave($event, slot.id)">
        <div v-if="slot.id === 1" class="d2p-slot-head" :class="{'d2p-slot-background': !itemAt(1)}"/>
        <div class="layer" :id="id + '-' + slot.id"></div>
        <Item v-if="itemAt(slot.id)"
            :class="slot.id === 1 ? 'd2p-slot-item' : ''"
            :item.sync="slotItems[slot.id]"
            @click.native="onSelect(itemAt(slot.id))"
            @contextmenu.prevent.stop="itemRC($event, itemAt(slot.id))"/>
      </span>
    </div>
  </div>
</template>

<script>
  import Item from './inventory/Item.vue';

  // equipped_id -> CSS class of the character panel (Equipped.vue)
  const SLOTS = [
    { id: 1, cls: 'd2p-slot-head' },
    { id: 2, cls: 'neck' },
    { id: 3, cls: 'torso' },
    { id: 4, cls: 'right-hand weapon' },
    { id: 5, cls: 'left-hand weapon' },
    { id: 6, cls: 'right-finger ring' },
    { id: 7, cls: 'left-finger ring' },
    { id: 8, cls: 'belt' },
    { id: 9, cls: 'feet' },
    { id: 10, cls: 'hands' },
  ];

  export default {
    components: {
      Item
    },
    props: {
      items: Array,
      contextMenu: Object,
      id: { type: String, default: 'Mercenary' },
    },
    data() {
      return { slots: SLOTS };
    },
    computed: {
      slotItems() {
        const bySlot = {};
        for (const item of this.items) bySlot[item.equipped_id] = item;
        return bySlot;
      },
    },
    methods: {
      itemAt(slotId) {
        return this.slotItems[slotId];
      },
      onSelect(item) {
        this.$emit('item-selected', item);
      },
      itemRC($evt, item) {
        if (item != null) {
          this.contextMenu.showContextMenu($evt, item, [
            {text: "Select"},
            {text: "Copy"},
            {text: "Share"},
            {text: "Delete"}
          ]);
        }
      },
      dragover(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        return false;
      },
      emitDrag(event, slotId, type) {
        event.preventDefault();
        const data = JSON.parse(localStorage.getItem('dragElement'));
        this.$emit('item-event', {
          uuid: data.uuid,
          item: data.item,
          id: `${this.id}-${slotId}`,
          location: { location: 1, equipped_location: slotId, merc: true },
          type: type,
        });
      },
      dragenter(event, slotId) { this.emitDrag(event, slotId, 'dragenter'); },
      dragleave(event, slotId) { this.emitDrag(event, slotId, 'dragleave'); },
      drop(event, slotId) { this.emitDrag(event, slotId, 'move'); },
    }
  };
</script>
