<template>
  <div>
    <div class="form-row">
      <!-- BW: one column per skill tree tab; mods can have more than 10 skills per tab -->
      <div class="col-md-4" v-for="page in pages" :key="page.page">
        <div class="row">
          <div class="col-md-6" v-for="skill in page.skills" :key="skill.id">
            <label :for="'Skill' + skill.id">{{skill.name || ('Skill #' + skill.id)}}</label>
            <input type="number" class="form-control" :id="'Skill' + skill.id" min="0" max="255"
                    v-model.number="skill.points">
          </div>
        </div>
      </div>
    </div>
    <br />
    <div class="form-row">
      <div class="input-group">
        <div class="input-group-prepend">
          <button type="button" class="btn btn-secondary" @click="setAll()">Set All To</button>
        </div>
        <input type="number" min="0" max="255" v-model="allSkills"/>
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    props: {
      save: Object,
    },
    data() {
      return {
        allSkills: null
      }
    },
    computed: {
      pages() {
        const byPage = {};
        for (const skill of this.save.skills) {
          const page = skill.page || 0;
          (byPage[page] = byPage[page] || []).push(skill);
        }
        // vanilla order: tab 1 is the rightmost in game, but keep 1-2-3 and untabbed skills last
        return Object.keys(byPage)
          .map(Number)
          .sort((a, b) => (a || 99) - (b || 99))
          .map(page => ({ page, skills: byPage[page] }));
      }
    },
    methods: {
      setAll() {
        if(this.allSkills === null || this.allSkills === undefined)
          return;
        for (const skill of this.save.skills) {
          skill.points = this.allSkills;
        }
        this.allSkills = null;
      }
    }
  };  
</script>
