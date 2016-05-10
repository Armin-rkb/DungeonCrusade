using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class PlayerWeapon : MonoBehaviour 
{
    private IWeapon currentWeapon;
    private DefaultBow defaultBow;
    private PillHolder pillHolder;
    private ShurikenHolder shurikenHolder;

    private List<IWeapon> weaponList = new List<IWeapon>();
    //The number of our current Weapon
    [SerializeField] private int num;
    //Cooldown of our gun
    private float cooldown = 0;

    void Awake()
    {
        //Getting all our weapon components
        defaultBow = GetComponent<DefaultBow>();
        pillHolder = GetComponent<PillHolder>();
        shurikenHolder = GetComponent<ShurikenHolder>();
    }

    void Start()
    {
        //Adding all weapons to our list
        weaponList.Add(defaultBow);
        weaponList.Add(pillHolder);
        weaponList.Add(shurikenHolder);

        currentWeapon = weaponList[num];
    }

    void Update()
    {
        SetWeapon();
        SwitchWeapons();

        if (cooldown <= 60)
        {
            cooldown--;

            if (cooldown <= 1)
                cooldown = 0;
        }

        if (Input.GetMouseButtonDown(0) && cooldown == 0)
        {
            cooldown = 60;
            currentWeapon.Shoot();
        }
    }


    void SetWeapon()
    {
        if (num < 0)
            num = 2;
        else if (num > 2)
            num = 0;
        currentWeapon = weaponList[num];
    }

    void SwitchWeapons()
    {
        //Switch with Scroll
        if (Input.GetAxis("Mouse ScrollWheel") > 0)
            num++;
        else if (Input.GetAxis("Mouse ScrollWheel") < 0)
            num--;
    }

}