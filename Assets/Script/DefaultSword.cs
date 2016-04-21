using UnityEngine;
using System.Collections;

public class DefaultSword : MonoBehaviour, IWeapons
{
    public void Attack()
    {
        //Hier moet de hitbox aan gaan
    }

    void OnCollisionEnter2D(Collision2D coll)
    {
        if (coll.gameObject.tag == "Player")
        {
            print("We hit: " + coll.gameObject);
        }
    }

    void Update()
    {
        if (Input.GetMouseButtonDown(0))
        {
            Attack();
        }
    }
}
