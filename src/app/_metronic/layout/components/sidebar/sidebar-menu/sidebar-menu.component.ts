import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MenuService } from '../sidebar.service';

interface MenuItem {
  title: string;
  route: string;
  icon?: string;           // Icon is optional
  subMenu?: MenuItem[];     // Submenu is optional
}


@Component({
  selector: 'app-sidebar-menu',
  templateUrl: './sidebar-menu.component.html',
  styleUrls: ['./sidebar-menu.component.scss']
})
export class SidebarMenuComponent implements OnInit {

  menu: MenuItem[] = [];
  
  constructor(private menuService: MenuService,    private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.menuService.getMenu(1).subscribe((data) => {
      this.menu = data;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

}
