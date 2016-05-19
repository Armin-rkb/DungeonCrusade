using UnityEngine;
using System.Collections;

public class Explosion : MonoBehaviour
{
    //Rigidbody of the Gameobject
    [SerializeField] private Rigidbody2D rbExplosion;
    //Collider of the Gameobject
    [SerializeField] private BoxCollider2D boxCollider;
    //Amout of damage that the bullet will deal
    [SerializeField] private float damage;
    //Amount of Knockback the bullet will give
    [SerializeField] private float knockback;

    void Hit(GameObject player)
    {
        //Finds the health script of the hit player 
        HealthPlayer healthPlayer = player.GetComponent<HealthPlayer>();
        healthPlayer.ChangeHealth(damage);
        //Give the player knockback
        //Rigidbody2D rbPlayer = player.GetComponent<Rigidbody2D>();
        //rbPlayer.AddForce((rbExplosion.position - rbPlayer.position).normalized * -knockback, ForceMode2D.Impulse);
    }

    void OnCollisionEnter2D(Collision2D coll)
    {
        if (coll.gameObject != null)
        {
            if (coll.gameObject.CompareTag(GameTags.player))
            {
                Hit(coll.gameObject);
                boxCollider.enabled = false;
                rbExplosion.isKinematic = true;
            }
        }
    }
}
