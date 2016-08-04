/*!
 * @license
 * Copyright 2016 Alfresco Software, Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import {
    DOCUMENT_LIST_DIRECTIVES,
    DOCUMENT_LIST_PROVIDERS,
    DocumentList
} from 'ng2-alfresco-documentlist';
import {
    MDL,
    AlfrescoContentService,
    CONTEXT_MENU_DIRECTIVES,
    AlfrescoPipeTranslate,
    AlfrescoAuthenticationService
} from 'ng2-alfresco-core';
import { PaginationComponent } from 'ng2-alfresco-datatable';
import { ALFRESCO_ULPOAD_COMPONENTS } from 'ng2-alfresco-upload';
import { VIEWERCOMPONENT } from 'ng2-alfresco-viewer';
import { FormService } from 'ng2-activiti-form';
import { PatientModel } from './patient.model';
import { TagModel, TagCache, TagFilter } from './tag.model';
import { TagService } from './tag.service';
import { ShareDataRow, RowFilter } from 'ng2-alfresco-documentlist';

declare let __moduleName: string;

@Component({
    moduleId: __moduleName,
    selector: 'patients-component',
    templateUrl: './patients.component.html',
    styleUrls: ['./patients.component.css'],
    directives: [
        DOCUMENT_LIST_DIRECTIVES,
        MDL,
        ALFRESCO_ULPOAD_COMPONENTS,
        VIEWERCOMPONENT,
        CONTEXT_MENU_DIRECTIVES,
        PaginationComponent
    ],
    providers: [DOCUMENT_LIST_PROVIDERS, FormService, TagService],
    pipes: [AlfrescoPipeTranslate]
})
export class PatientsComponent implements OnInit {

    currentPath: string = '/Sites/swsdp/documentLibrary';

    urlFile: string;
    fileName: string;
    mimeType: string;
    fileShowed: boolean = false;

    acceptedFilesType: string = '.jpg,.pdf,.js';

    @ViewChild(DocumentList)
    documentList: DocumentList;

    newPatient: PatientModel;
    debugMode: boolean = false;

    tags: TagCache = {};
    tagFilters: TagFilter[] = [];
    selectedNodeId: string;
    tagFilter: RowFilter;

    constructor(private contentService: AlfrescoContentService,
                private router: Router,
                private tagService: TagService,
                private authService: AlfrescoAuthenticationService) {
        this.newPatient = new PatientModel();

        this.tagFilter = (row: ShareDataRow) => {
            let selectedTags = this.tagFilters
                .filter(f => f.isSelected)
                .map(f => f.id);

            if (selectedTags.length > 0) {
                let properties = row.node.entry.properties;
                if (properties) {
                    let tags = properties['cm:taggable'];
                    if (tags && tags instanceof Array && tags.length > 0) {

                        let result = false;

                        for (let i = 0; i < selectedTags.length; i++) {
                            if (tags.indexOf(selectedTags[i]) > -1) {
                                result = true;
                                break;
                            }
                        }

                        return result;
                    }
                }
                return false;
            }

            return true;
        };
    }

    resetFilters() {
        if (this.tagFilters && this.tagFilters.length > 0) {
            this.tagFilters.map(f => f.isSelected = false);
            this.documentList.reload();
        }
    }

    patientDetails(event: any) {
        this.router.navigate(['/patientdetails', event.value.entry.id]);
    }

    showFile(event) {
        if (event.value.entry.isFile) {
            this.fileName = event.value.entry.name;
            this.mimeType = event.value.entry.content.mimeType;
            this.urlFile = this.contentService.getContentUrl(event.value);
            this.fileShowed = true;
        } else {
            this.fileShowed = false;
        }
    }

    onFolderChanged(event?: any) {
        if (event) {
            this.currentPath = event.path;
            this.loadTags();
        }
    }

    ngOnInit() {
        // this.loadTags();
    }

    onNodeClicked(event?: any) {
        console.log(event);
        if (event && event.value) {
            this.selectedNodeId = event.value.entry.id;
        }
    }

    onFilterChanged(event) {
        setTimeout(() => {
            this.documentList.reload();
        }, 500);
    }

    setNodeTags(nodeId: string, value: string) {
        if (nodeId && value) {
            let tags = value.split(',').map(val => {
                return {
                    tag: val.trim()
                }
            });

            this.tagService.addTags(nodeId, tags).then(
                data => {
                    console.log(data);
                    // TODO: share seems to have issues with returning newly created tags
                    /*
                    this.getTags().then(
                        res => {
                            console.log('after tags updated');
                            console.log(res);
                            this.tags = res || [];
                            this.documentList.reload();
                        },
                        this.handleError
                    );
                    */
                    window.alert('Done');
                },
                this.handleError
            );
        }
    }

    onCreateNewPatientClick() {
        if (this.newPatient && this.newPatient.folderName) {
            let body = {
                name: this.newPatient.folderName,
                nodeType: 'hc:patientFolder',
                properties: {
                    'hc:firstName': this.newPatient.firstName,
                    'hc:lastName': this.newPatient.lastName,
                    'hc:doctor': this.newPatient.doctor
                },
                relativePath: this.currentPath
            };
            let opts = {};
            // TODO: move to separate service
            this.authService.getAlfrescoApi().nodes.addNode('-root-', body, opts).then(
                (data) => {
                    this.newPatient = new PatientModel();
                    console.log(data);
                    this.documentList.reload();
                },
                this.handleError
            );
        }
    }

    private loadTags() {
        this.tagService.getTags().then(
            (tags: TagModel[]) => {
                this.tagFilters = tags.map((tag) => new TagFilter(tag.id, tag.tag));
                tags.forEach(tag => this.tags[tag.id] = tag);
            },
            this.handleError
        );
    }

    private handleError(err) {
        console.log(err);
    }
}
