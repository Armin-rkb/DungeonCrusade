using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class PlayerWeapon : MonoBehaviour 
{
    public IWeapon currentWeapon;
    private PlayerMovement playerMovement;

    public List<IWeapon> weaponList = new List<IWeapon>();
    //Cooldown of our gun
    private float cooldown = 0;
    private float maxCooldown = 60;
    //The number of our current Weapon
    public int currNumber;
    /*
    WeaponList:
        0 = Stone
        1 = Pill
        2 = Shuriken
        3 = Hadouken
        4 = Pizza
        5 = Barrel
        6 = Sock
        7 = Duck
        8 = Bom
    */

    public void SetNewWeapon(int wepNumber)
    {
        currentWeapon = weaponList[wepNumber];
        currNumber = wepNumber;
        SetWeaponCooldown(wepNumber);
        cooldown = 20;
    }

    void SetWeaponCooldown(int weaponNum)
    {
        switch (weaponNum)
        {
            //Stone
            case 0:
                maxCooldown = 45;
                break;
            //Pill
            case 1:
                maxCooldown = 50;
                break;
            //Shuriken
            case 2:
                maxCooldown = 25;
                break;
            //Hadouken
            case 3:
                maxCooldown = 45;
                break;
            //Pizza
            case 4:
                maxCooldown = 90;
                break;
            //Barrel
            case 5:
                maxCooldown = 45;
                break;
            //Sock
            case 6:
                maxCooldown = 80;
                break;
            //Duck
            case 7:
                maxCooldown = 80;
                break;
            //Bom
            case 8:
                maxCooldown = 85;
                break;
            //Music Note
            case 9:
                maxCooldown = 65;
                break;
        }
    }

    void Awake()
    {
        playerMovement = GetComponent<PlayerMovement>();

        //Getting all our weapon components
        IWeapon[] weapons = GetComponents<IWeapon>();

        //Adding all weapons to our list
        foreach (IWeapon weapon in weapons)
        {
            weaponList.Add(weapon);
        }

        currentWeapon = weaponList[currNumber];
    }

    void Update()
    {
        if (cooldown <= maxCooldown)
        {
            cooldown--;

            if (cooldown <= 1)
                cooldown = 0;
        }

        if (Input.GetButtonDown(ControllerInputs.attackp + playerMovement.PlayerNumber) && cooldown == 0)
        {
            cooldown = maxCooldown;
            currentWeapon.Shoot();
        }
    }
}