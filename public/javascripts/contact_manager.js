/* eslint-disable quote-props */
/* eslint-disable no-use-before-define */
/* eslint-disable max-lines-per-function */

document.addEventListener('DOMContentLoaded', () => {
  const templates = {};
  const main = document.querySelector('main');

  document.querySelectorAll("script[type='text/x-handlebars']").forEach(tmpl => {
    templates[tmpl['id']] = Handlebars.compile(tmpl['innerHTML']);
  });

  document.querySelectorAll('[data-type=partial]').forEach(tmpl => {
    Handlebars.registerPartial(tmpl['id'], tmpl['innerHTML']);
  });

  function clearSection(section) {
    section.innerHTML = '';
  }

  class ContactManager {
    constructor() {
      this.allContacts = null;
      this.allUniqueTags = [];
      this.renderAllContacts();
    }

    renderSections() {
      main.insertAdjacentHTML('beforeend', templates.sections());
    }

    renderAllContacts() {
      clearSection(main);
      this.renderSections();
      this.topActionBarSection = document.querySelector('.top-action-bar-section');
      this.contactListSection = document.querySelector('.contact-list-section');
      this.contactFormSection = document.querySelector('.contact-form-section');

      fetch('/api/contacts')
        .then(response => response.json())
        .then(json => {
          this.allContacts = json;
          this.setAllUniqueTags();

          let topActionBar = new TopActionBar();
          topActionBar.renderTopActionBar();

          let contactList = new ContactList(this.allContacts);
          contactList.renderContactList();
        });
    }

    getAllUniqueTags(allContacts) {
      let allUniqueTags = [];
      allContacts.forEach(contact => {
        if (contact.tags) {
          let tagsArr = contact.tags.toLowerCase().split(',');
          allUniqueTags = allUniqueTags.concat(tagsArr);
        }
      });

      this.uniqueTagsArr = [...new Set(allUniqueTags)];
      let uniquesTagsObjArr = this.uniqueTagsArr.map(tag => {
        return { tag: tag };
      });

      return uniquesTagsObjArr;
    }

    setAllUniqueTags() {
      let tagsFromContacts = this.getAllUniqueTags(this.allContacts);
      if (this.allUniqueTags.length < tagsFromContacts.length) {
        this.allUniqueTags = tagsFromContacts;
      }
    }
  }

  class TopActionBar {
    constructor() {}

    renderTopActionBar() {
      clearSection(contactManager.topActionBarSection);
      contactManager.topActionBarSection.insertAdjacentHTML('beforeend',
        templates['top-action-bar']({ tags: contactManager.allUniqueTags }));
      this.addContactButton = document.querySelector('.add-contact-btn a');
      this.bindAddContactButton();
      this.bindSearch();
      this.bindTagsFilter();
      this.bindAddTag();
    }

    bindAddContactButton() {
      this.addContactButton.addEventListener('click', event => {
        event.preventDefault();
        let contactForm = new ContactForm();
        contactForm.getCreateContactForm();
      });
    }

    bindSearch() {
      contactManager.topActionBarSection.querySelector('.search input')
        .addEventListener('input', event => {
          event.preventDefault();
          let searchName = event.target.value;
          let filteredContactList = this.filterContactsByName(
            contactManager.allContacts, searchName);
          let filteredIds = this.getContactIds(filteredContactList);
          this.renderFilteredContactList(filteredIds);
        });
    }

    filterContactsByName(contactsArr, searchName) {
      return contactsArr.filter(contact => {
        let contactName = contact.full_name;
        let regex = new RegExp(searchName, 'gi');
        return regex.test(contactName);
      });
    }

    getContactIds(filteredContactList) {
      return filteredContactList.map(contact => contact.id);
    }

    renderFilteredContactList(filteredIds) {
      fetch('/api/contacts')
        .then(response => response.json())
        .then(json => {
          let filteredContacts = json.filter(contact => {
            return filteredIds.some(filteredId => filteredId === contact.id);
          });

          let contactList = new ContactList(filteredContacts);
          contactList.renderContactList();
        });
    }

    bindTagsFilter() {
      document.querySelector('.tags').addEventListener('click', event => {
        let tagClicked = event.target;
        if (tagClicked.classList.contains('tag-btn')) {
          event.preventDefault();
          tagClicked.classList.toggle('active');
        }

        let selectedTags = this.getSelectedTags();
        let filteredContactList = this.filterContactsByTag(
          contactManager.allContacts, selectedTags);
        let filteredIds = this.getContactIds(filteredContactList);
        this.renderFilteredContactList(filteredIds);
      });
    }

    getSelectedTags() {
      let elementsFiltered = document.querySelectorAll('.active');
      let selectedTags = [];
      elementsFiltered.forEach(elem => {
        selectedTags.push(elem.textContent);
      });
      return selectedTags;
    }

    filterContactsByTag(contactsArr, selectedTags) {
      return contactsArr.filter(contact => {
        return selectedTags.every(selectedTag => {
          let regex = new RegExp(selectedTag, 'gi');
          return regex.test(contact.tags);
        });
      });
    }

    bindAddTag() {
      this.form = document.querySelector('.add-tag-form form');
      this.form.addEventListener('submit', event => {
        event.preventDefault();
        let data = new FormData(this.form);
        let newTag = data.get('add-tag').toLowerCase();

        if (isNewTag(newTag)) {
          contactManager.allUniqueTags.push({ tag: newTag });
          this.renderTopActionBar();
        } else {
          document.querySelector('.duplicate').innerHTML = 'Tag already exists!';
        }

        function isNewTag(newTag) {
          return contactManager.uniqueTagsArr.every(tag => tag !== newTag);
        }
      });
    }
  }

  class ContactList {
    constructor(contactsToRender) {
      this.contactsToRender = contactsToRender;
    }

    renderContactList() {
      clearSection(contactManager.contactListSection);
      contactManager.contactListSection.insertAdjacentHTML('beforeend',
        templates.contacts({ contacts: this.contactsToRender }));
      this.bindDeleteContactButton();
      this.bindEditButton();
    }

    bindDeleteContactButton() {
      contactManager.contactListSection.addEventListener('click', event => {
        let button = event.target;

        if (button.classList.contains('delete-btn')) {
          event.preventDefault();
          let id = button.parentElement.getAttribute('data-id');
          let href = `/api/contacts/${id}`;

          fetch(href, {
            method: 'DELETE'
          })
            .then(contactManager.renderAllContacts());
        }
      });
    }

    bindEditButton() {
      contactManager.contactListSection.addEventListener('click', event => {
        let button = event.target;

        if (button.classList.contains('edit-btn')) {
          event.preventDefault();
          let id = button.parentElement.getAttribute('data-id');
          let href = `/api/contacts/${id}`;
          let contactForm = new ContactForm();
          contactForm.getEditContactForm(href);
        }
      });
    }
  }

  class ContactForm {
    constructor() {
      clearSection(contactManager.topActionBarSection);
      clearSection(contactManager.contactListSection);
    }

    getCreateContactForm() {
      this.createContactFormData = { 'form_name': 'Create Contact' };
      this.renderContactForm(this.createContactFormData);
      this.form = document.querySelector('.main-contact-form');
      this.cancelButton = this.form.querySelector('.cancel');
      this.bindCreateContactFormAction();
      this.bindCancelButton();
      this.bindTagsSelector();
    }

    getEditContactForm(href) {
      fetch(href)
        .then(response => response.json())
        .then(json => {
          json['form_name'] = 'Edit Contact';
          this.editContactFormData = json;
          this.renderContactForm(this.editContactFormData);
          this.form = document.querySelector('.main-contact-form');
          this.cancelButton = this.form.querySelector('.cancel');
          this.bindEditContactFormAction(href);
          this.bindCancelButton();
          this.bindTagsSelector();
        });
    }

    renderContactForm(formtype) {
      clearSection(contactManager.contactFormSection);
      contactManager.contactFormSection.insertAdjacentHTML('beforeend', templates['contact-form'](formtype));
      contactManager.contactFormSection.insertAdjacentHTML('beforeend', templates['tag-form']({ tags: contactManager.allUniqueTags }));
    }

    bindCreateContactFormAction() {
      this.form.addEventListener('submit', event => {
        event.preventDefault();
        let data = new FormData(this.form);

        fetch('/api/contacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
          },
          body: new URLSearchParams([...data])
        })
          .then(contactManager.renderAllContacts());
      });
    }

    bindEditContactFormAction(href) {
      this.form.addEventListener('submit', event => {
        event.preventDefault();
        let data = new FormData(this.form);

        fetch(href, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
          },
          body: new URLSearchParams([...data])
        })
          .then(contactManager.renderAllContacts());
      });
    }

    bindCancelButton() {
      this.cancelButton.addEventListener('click', event => {
        event.preventDefault();
        contactManager.renderAllContacts();
      });
    }

    bindTagsSelector() {
      let tagFieldset = document.querySelector('.tag-list-form fieldset');
      let contactFormTagValue = document.querySelector('.main-contact-form #tags').value;
      let currentTagsArr = contactFormTagValue.split(',');

      if (currentTagsArr[0] === '') {
        currentTagsArr = [];
      }

      if (currentTagsArr.length !== 0) {
        currentTagsArr.forEach(tag => {
          let tagInput = tagFieldset.querySelector(`.${tag} input`);
          tagInput.checked = true;
        });
      }

      tagFieldset.addEventListener('change', event => {
        let selectedTag = event.target;
        if (selectedTag.checked === true) {
          currentTagsArr.push(selectedTag.value);
        } else {
          let index = currentTagsArr.indexOf(selectedTag.value);
          currentTagsArr.splice(index, 1);
        }

        contactFormTagValue = currentTagsArr.join(',');
        document.querySelector('.main-contact-form #tags').value = contactFormTagValue;
      });
    }
  }

  let contactManager = new ContactManager();

});

