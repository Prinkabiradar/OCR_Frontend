import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { LayoutType } from '../../../core/configs/config';
import { LayoutService } from '../../../core/layout.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-sidebar-logo',
  templateUrl: './sidebar-logo.component.html',
  styleUrls: ['./sidebar-logo.component.scss'],
})
export class SidebarLogoComponent implements OnInit, OnDestroy {
  private unsubscribe: Subscription[] = [];
  @Input() toggleButtonClass: string = '';
  @Input() toggleEnabled: boolean;
  @Input() toggleType: string = '';
  @Input() toggleState: string = '';
  currentLayoutType: LayoutType | null;

  toggleAttr: string;

  private authLocalStorageToken = `${environment.appVersion}-${environment.USERDATA_KEY}`;
  private baseUrl = environment.BaseUrl;

  companyLogoURL: string | null = null;

  constructor(private layout: LayoutService) {}

  ngOnInit(): void {
    this.toggleAttr = `app-sidebar-${this.toggleType}`;
    const layoutSubscr = this.layout.currentLayoutTypeSubject
      .asObservable()
      .subscribe((layout) => {
        this.currentLayoutType = layout;
      });
    this.unsubscribe.push(layoutSubscr);

    this.detectUser();
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }

  detectUser() {
    const lsValue = localStorage.getItem(this.authLocalStorageToken);

    if (lsValue) {
      try {
        const userData = JSON.parse(lsValue);

        const logoPath = userData?.companyLogoURL?.trim() || '';

        if (logoPath) {
          this.companyLogoURL = logoPath.startsWith('http')
            ? logoPath
            : `${this.baseUrl}${logoPath}`;
        } else {
          this.companyLogoURL = './assets/media/logos/default.svg';
        }
      } catch (error) {
        this.companyLogoURL = './assets/media/logos/default.svg';
      }
    } else {
      this.companyLogoURL = './assets/media/logos/default.svg';
    }
  }
}
