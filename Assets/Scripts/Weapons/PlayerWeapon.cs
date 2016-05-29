using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class PlayerWeapon : MonoBehaviour 
{
    public IWeapon currentWeapon;
    
    private StoneHolder stoneHolder;
    private PillHolder pillHolder;
    private ShurikenHolder shurikenHolder;
    private HadoukenHolder hadoukenHolder;
    private PizzaHolder pizzaHolder;
    private SockHolder sockHolder;
    private BarrelHolder barrelHolder;
    private DuckHolder duckHolder;
    
    private PlayerMovement playerMovement;

    public List<IWeapon> weaponList = new List<IWeapon>();
    //Cooldown of our gun
    private float cooldown = 0;
    //The number of our current Weapon
    public int currNumber;
    /*
    WeaponList:
        0 = Stone
        1 = Pill
        2 = Shuriken
        3 = Hadouken
        4 = Pizza
        5 = Sock
        6 = Barrel
        7 = Duck
    */
    
    public void SetNewWeapon(int wepNumber)
    {
        currentWeapon = weaponList[wepNumber];
        currNumber = wepNumber;
    }

    void CheckNewCooldown()
    {
        //Hier een Case Switch maken voor cooldown
    }

    void Awake()
    {
        playerMovement = GetComponent<PlayerMovement>();
        //Getting all our weapon components
        
        stoneHolder = GetComponent<StoneHolder>();
        pillHolder = GetComponent<PillHolder>();
        shurikenHolder = GetComponent<ShurikenHolder>();
        hadoukenHolder = GetComponent<HadoukenHolder>();
        pizzaHolder = GetComponent<PizzaHolder>();
        sockHolder = GetComponent<SockHolder>();
        barrelHolder = GetComponent<BarrelHolder>();
        duckHolder = GetComponent<DuckHolder>();
    }

    void Start()
    {
        //Adding all weapons to our list
        
        weaponList.Add(stoneHolder);
        weaponList.Add(pillHolder);
        weaponList.Add(shurikenHolder);
        weaponList.Add(hadoukenHolder);
        weaponList.Add(pizzaHolder);
        weaponList.Add(sockHolder);
        weaponList.Add(barrelHolder);
        weaponList.Add(duckHolder);
        
        currentWeapon = weaponList[currNumber];
    }

    void Update()
    {
        if (cooldown <= 60)
        {
            cooldown--;

            if (cooldown <= 1)
                cooldown = 0;
        }

        if (Input.GetButtonDown(ControllerInputs.attackp + playerMovement.PlayerNumber) && cooldown == 0)
        {
            cooldown = 60;
            currentWeapon.Shoot();
        }
    }
}